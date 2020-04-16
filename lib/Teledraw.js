"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const colyseus_1 = require("colyseus");
const schema_1 = require("@colyseus/schema");
const TeledrawSchema_1 = require("./TeledrawSchema");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NameTaken"] = 4000] = "NameTaken";
    ErrorCode[ErrorCode["GameStarted"] = 4001] = "GameStarted";
})(ErrorCode || (ErrorCode = {}));
class Teledraw extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.prompts = [];
    }
    // autoDispose = false;
    onCreate(options) {
        const state = new TeledrawSchema_1.TeledrawSchema();
        state.code = options.code;
        state.state = TeledrawSchema_1.GameState.Lobby;
        this.setState(state);
    }
    debug(...args) {
        console.debug("Debug: ", ...args);
    }
    onAuth(client, options, request) {
        const { name } = options;
        const users = this.state.users;
        if (users[name] && users[name].isPresent) {
            const message = `Username already taken: ${name}`;
            console.error(message);
            return false;
        }
        return true;
    }
    onJoin(client, options) {
        const { name } = options;
        const users = this.state.users;
        if (users[name]) {
            if (users[name].isPresent) {
                const message = `Username already taken: ${name}`;
                console.error(message);
                client.close(ErrorCode.NameTaken);
                return;
            }
            else {
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
        if (this.state.state !== TeledrawSchema_1.GameState.Lobby) {
            const message = "Cannot join. Game has already started.";
            this.send(client, {
                type: "error",
                code: ErrorCode.GameStarted,
                message,
            });
            return;
        }
        const user = new TeledrawSchema_1.User();
        user.name = name;
        user.sessionId = client.sessionId;
        user.isPresent = true;
        this.state.users[name] = user;
        this.state.sessionName[user.sessionId] = name;
        console.info(`${name} joined`);
    }
    onMessage(client, message) {
        switch (message.type) {
            case "startGame":
                return this.startGame(client);
            case "submitGuess":
                return this.submitGuess(client, message.guess);
            case "submitDrawing":
                return this.submitDrawing(client, message.imageFilename);
        }
    }
    onLeave(client, consented) {
        const name = this.state.sessionName[client.sessionId];
        if (!name) {
            return;
        }
        const user = this.state.users[name];
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
    startGame(client) {
        const promptsJson = JSON.parse(fs_1.default.readFileSync(__dirname + "/prompts.json").toString());
        if (this.state.partyLeader !== client.sessionId) {
            return;
        }
        for (let name in this.state.users) {
            this.state.userOrder.push(name);
        }
        this.prompts = promptsJson;
        const promptIndices = [];
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
        this.state.state = TeledrawSchema_1.GameState.Playing;
    }
    restartGame() {
        console.info("Game is restarting...");
        // Clear all the old stuff out
        this.state.state = TeledrawSchema_1.GameState.Lobby;
        this.clearDrawings();
        this.state.flipbookAssignments = new schema_1.MapSchema();
        this.state.flipbooks = new schema_1.MapSchema();
        this.state.reviewBook = "";
        this.state.rotations = 0;
        this.state.userOrder = new schema_1.ArraySchema();
    }
    clearDrawings() {
        this.state.userOrder.forEach((name) => {
            const flipbook = this.state.flipbooks[name];
            if (flipbook) {
                flipbook.entries.forEach((entry) => {
                    if (entry.type === TeledrawSchema_1.EntryType.Draw) {
                        const path = `${__dirname}/uploads/${entry.value}`;
                        if (fs_1.default.existsSync(path)) {
                            fs_1.default.unlinkSync(path);
                        }
                    }
                });
            }
        });
    }
    initFlipbook(name, prompt) {
        const flipbook = new TeledrawSchema_1.Flipbook();
        flipbook.owner = name;
        flipbook.prompt = prompt;
        const userIndex = this.state.userOrder.indexOf(name);
        if (userIndex < 0) {
            throw new Error(`Something went wrong finding index of name ${name}`);
        }
        for (let i = 0; i < this.state.userOrder.length; i++) {
            const entry = new TeledrawSchema_1.FlipbookEntry();
            entry.author = this.state.userOrder[(i + userIndex) % this.state.userOrder.length];
            entry.type = i % 2 ? TeledrawSchema_1.EntryType.Guess : TeledrawSchema_1.EntryType.Draw;
            flipbook.entries.push(entry);
        }
        this.state.flipbookAssignments[name] = name;
        return flipbook;
    }
    submitDrawing(client, imageFilename) {
        const name = this.getClientName(client);
        const assignedName = this.state.flipbookAssignments[name];
        const flipbook = this.state.flipbooks[assignedName];
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
    submitGuess(client, guess) {
        const name = this.getClientName(client);
        const assignedName = this.state.flipbookAssignments[name];
        const flipbook = this.state.flipbooks[assignedName];
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
    rotateFlipbooks() {
        let canRotate = true;
        const rotation = Number(this.state.rotations);
        this.state.userOrder.forEach((name) => {
            const assignedName = this.state.flipbookAssignments[name];
            const flipbook = this.state.flipbooks[assignedName];
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
            this.state.state = TeledrawSchema_1.GameState.Reviewing;
            return false;
        }
        this.state.rotations++;
        return true;
    }
    findNextAssignee(name) {
        return this.state.userOrder[(this.state.userOrder.indexOf(name) + 1) % this.state.userOrder.length];
    }
    getClientName(client) {
        return this.state.sessionName[client.sessionId];
    }
    startReview() {
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
    prepFlipbooksForReview() {
        this.state.userOrder.forEach((name) => {
            const book = this.state.flipbooks[name];
            const oldEntries = book.entries.clone();
            book.entries = new schema_1.ArraySchema();
            const promptEntry = new TeledrawSchema_1.FlipbookEntry();
            promptEntry.author = name;
            promptEntry.type = "prompt";
            promptEntry.value = book.prompt;
            promptEntry.doShowReview = false;
            book.entries.push(promptEntry);
            oldEntries.forEach((e) => book.entries.push(e));
        });
    }
    advanceReviewFlipbook(index, max) {
        const name = this.state.userOrder[index];
        const book = this.state.flipbooks[name];
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
exports.Teledraw = Teledraw;
