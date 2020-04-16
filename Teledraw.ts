import fs from "fs";
import { Room, Client } from "colyseus";
import { ArraySchema, MapSchema } from "@colyseus/schema";
import {
  TeledrawSchema,
  GameState,
  User,
  Flipbook,
  FlipbookEntry,
  EntryType,
} from "./TeledrawSchema";

enum ErrorCode {
  NameTaken = 4000,
  GameStarted,
}

export class Teledraw extends Room<TeledrawSchema> {
  private prompts: string[] = [];

  // autoDispose = false;

  onCreate(options: any) {
    const state = new TeledrawSchema();
    state.code = options.code;
    state.state = GameState.Lobby;

    this.setState(state);
  }

  debug(...args: any[]) {
    console.debug("Debug: ", ...args);
  }

  onAuth(client: Client, options: any, request: any): boolean {
    const { name } = options;
    const users = this.state.users;

    if (users[name] && users[name].isPresent) {
      const message = `Username already taken: ${name}`;
      console.error(message);
      return false;
    }

    return true;
  }

  onJoin(client: Client, options: any) {
    const { name } = options;
    const users = this.state.users;

    if (users[name]) {
      if (users[name].isPresent) {
        const message = `Username already taken: ${name}`;
        console.error(message);
        client.close(ErrorCode.NameTaken);
        return;
      } else {
        const user = users[name];

        if (this.state.partyLeader === user.sessionId) {
          this.state.partyLeader = client.sessionId;
        }

        user.sessionId = client.sessionId;
        this.state.sessionName[user.sessionId] = name;
        user.isPresent = true;
        console.info(`${name} rejoined`);
        return;
      }
    }

    if (this.state.users._indexes.size === 0) {
      this.state.partyLeader = client.sessionId;
    }

    if (this.state.state !== GameState.Lobby) {
      const message = "Cannot join. Game has already started.";
      this.send(client, {
        type: "error",
        code: ErrorCode.GameStarted,
        message,
      });
      return;
    }

    const user = new User();
    user.name = name;
    user.sessionId = client.sessionId;
    user.isPresent = true;
    this.state.users[name] = user;
    this.state.sessionName[user.sessionId] = name;

    console.info(`${name} joined`);
  }

  onMessage(client: Client, message: any) {
    switch (message.type) {
      case "startGame":
        return this.startGame(client);
      case "submitGuess":
        return this.submitGuess(client, message.guess);
      case "submitDrawing":
        return this.submitDrawing(client, message.imageFilename);
    }
  }

  onLeave(client: Client, consented: boolean) {
    const name = this.state.sessionName[client.sessionId] as string;

    if (!name) {
      return;
    }

    const user = this.state.users[name] as User;

    if (!user) {
      return;
    }

    user.isPresent = false;
    this.state.sessionName[client.sessionId] = "";
    console.info(`${name} left. Consent: ${consented}`);
  }

  onDispose() {
    this.clearDrawings();
  }

  startGame(client: Client) {
    const promptsJson = JSON.parse(
      fs.readFileSync(__dirname + "/prompts.json").toString()
    );

    if (this.state.partyLeader !== client.sessionId) {
      return;
    }

    for (let name in this.state.users) {
      this.state.userOrder.push(name);
    }

    this.prompts = promptsJson;
    const promptIndices: number[] = [];

    this.state.userOrder.forEach(() => {
      let randomIndex = Math.round(Math.random() * (this.prompts.length - 1));

      while (promptIndices.includes(randomIndex)) {
        randomIndex = Math.round(Math.random() * (this.prompts.length - 1));
      }

      promptIndices.push(randomIndex);
    });

    for (let name in this.state.users) {
      const promptIndex = promptIndices.pop();
      const flipbook = this.initFlipbook(name, this.prompts[promptIndex]);
      this.state.flipbooks[name] = flipbook;
    }

    this.state.state = GameState.Playing;
  }

  private restartGame() {
    console.info("Game is restarting...");
    // Clear all the old stuff out
    this.state.state = GameState.Lobby;
    this.clearDrawings();
    this.state.flipbookAssignments = new MapSchema<string>();
    this.state.flipbooks = new MapSchema<Flipbook>();
    this.state.reviewBook = "";
    this.state.rotations = 0;
    this.state.userOrder = new ArraySchema<string>();
  }

  private clearDrawings() {
    this.state.userOrder.forEach((name) => {
      const flipbook: Flipbook = this.state.flipbooks[name];

      if (flipbook) {
        flipbook.entries.forEach((entry) => {
          if (entry.type === EntryType.Draw) {
            const path = `${__dirname}/uploads/${entry.value}`;
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
          }
        });
      }
    });
  }

  private initFlipbook(name: string, prompt: string): Flipbook {
    const flipbook = new Flipbook();
    flipbook.owner = name;
    flipbook.prompt = prompt;

    const userIndex = this.state.userOrder.indexOf(name);

    if (userIndex < 0) {
      throw new Error(`Something went wrong finding index of name ${name}`);
    }

    for (let i = 0; i < this.state.userOrder.length; i++) {
      const entry = new FlipbookEntry();
      entry.author = this.state.userOrder[
        (i + userIndex) % this.state.userOrder.length
      ];
      entry.type = i % 2 ? EntryType.Guess : EntryType.Draw;

      flipbook.entries.push(entry);
    }

    this.state.flipbookAssignments[name] = name;
    return flipbook;
  }

  submitDrawing(client: Client, imageFilename: string) {
    const name = this.getClientName(client);
    const assignedName = this.state.flipbookAssignments[name];
    const flipbook = this.state.flipbooks[assignedName] as Flipbook;
    const entry = flipbook.entries[this.state.rotations];

    if (!entry) {
      console.error(`Submit drawing: Something went horribly wrong: ${name}`);
      return;
    }

    entry.author = this.state.sessionName[client.sessionId];
    entry.value = imageFilename;

    console.info("attempting rotation");
    if (this.rotateFlipbooks()) {
      console.info("Rotated");
    }
  }

  submitGuess(client: Client, guess: string) {
    const name = this.getClientName(client);
    const assignedName = this.state.flipbookAssignments[name];
    const flipbook = this.state.flipbooks[assignedName] as Flipbook;
    const entry = flipbook.entries[this.state.rotations];

    console.info(`${name} guess ${guess}`);

    if (!entry) {
      console.error(`Submit guess: Something went horribly wrong: ${name}`);
      return;
    }

    entry.author = this.state.sessionName[client.sessionId];
    entry.value = guess;

    if (this.rotateFlipbooks()) {
      console.info("Rotated");
    }
  }

  rotateFlipbooks(): boolean {
    let canRotate = true;
    const rotation = Number(this.state.rotations);

    this.state.userOrder.forEach((name) => {
      const assignedName = this.state.flipbookAssignments[name];
      const flipbook = this.state.flipbooks[assignedName] as Flipbook;
      const entry = flipbook.entries[rotation];
      const isSubmitted = !!entry.value;

      canRotate = canRotate && isSubmitted;
    });

    if (!canRotate) {
      return false;
    }

    this.state.userOrder.forEach((name) => {
      const assignedName = this.state.flipbookAssignments[name];
      const nextAssignedName = this.findNextAssignee(assignedName);
      this.state.flipbookAssignments[name] = nextAssignedName;
    });

    if (rotation + 1 >= this.state.userOrder.length) {
      console.info("Moving to reviewing state");
      this.startReview();
      this.state.state = GameState.Reviewing;
      return false;
    }

    this.state.rotations++;

    return true;
  }

  findNextAssignee(name: string): string {
    return this.state.userOrder[
      (this.state.userOrder.indexOf(name) + 1) % this.state.userOrder.length
    ];
  }

  private getClientName(client: Client): string {
    return this.state.sessionName[client.sessionId];
  }

  private startReview() {
    this.prepFlipbooksForReview();
    this.clock.start();
    const time = 6000;
    let max = this.state.userOrder.length - 1;
    let index = 0;

    const tick = () => {
      this.advanceReviewFlipbook(index, max);

      max--;

      if (max < -1) {
        index++;
        max = this.state.userOrder.length - 1;
      }

      if (index >= this.state.userOrder.length) {
        interval.clear();
        this.clock.setTimeout(() => {
          this.restartGame();
          this.clock.stop();
        }, time);
      }
    };

    tick();
    const interval = this.clock.setInterval(() => {
      tick();
    }, time);
  }

  private prepFlipbooksForReview() {
    this.state.userOrder.forEach((name) => {
      const book = this.state.flipbooks[name] as Flipbook;
      const oldEntries = book.entries.clone();
      book.entries = new ArraySchema<FlipbookEntry>();

      const promptEntry = new FlipbookEntry();
      promptEntry.author = name;
      promptEntry.type = "prompt";
      promptEntry.value = book.prompt;
      promptEntry.doShowReview = false;
      book.entries.push(promptEntry);

      oldEntries.forEach((e: FlipbookEntry) => book.entries.push(e));
    });
  }

  private advanceReviewFlipbook(index: number, max: number) {
    const name = this.state.userOrder[index];
    const book = this.state.flipbooks[name] as Flipbook;

    for (let i = book.entries.length - 1; i > max; i--) {
      if (i >= 0) {
        book.entries[i].doShowReview = true;
      }
    }

    this.clock.stop();
    this.state.reviewBook = name;
    this.clock.start();
  }
}
