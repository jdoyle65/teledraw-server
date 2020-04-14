import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class User extends Schema {
  @type("string")
  sessionId: string = "";

  @type("string")
  name: string = "";

  @type("boolean")
  isPresent: boolean = false;
}

export class FlipbookEntry extends Schema {
  @type("string")
  type: string = "";

  @type("string")
  author: string = "";

  @type("string")
  value: string = "";

  @type("boolean")
  doShowReview = false;
}

export class Flipbook extends Schema {
  @type("string")
  owner: string = "";

  @type("string")
  prompt: string = "";

  @type([FlipbookEntry])
  entries = new ArraySchema<FlipbookEntry>();
}

export class TeledrawSchema extends Schema {
  @type("string")
  code: string = "";

  @type("string")
  state: string = "";

  @type({ map: User })
  users = new MapSchema<User>();

  @type({ map: "string" })
  sessionName = new MapSchema<string>();

  @type("string")
  partyLeader: string = "";

  @type({ map: Flipbook })
  flipbooks = new MapSchema<Flipbook>();

  @type({ map: "string" })
  flipbookAssignments = new MapSchema<string>();

  @type(["string"])
  userOrder = new ArraySchema<string>();

  @type("number")
  rotations = 0;

  @type("string")
  reviewBook: string = "";
}

export enum EntryType {
  Draw = "draw",
  Guess = "guess",
}

export enum GameState {
  Lobby = "lobby",
  Playing = "playing",
  Reviewing = "reviewing",
}
