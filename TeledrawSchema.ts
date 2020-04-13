import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class User extends Schema {
  @type("string")
  sessionId: string;

  @type("string")
  name: string;

  @type("boolean")
  isPresent: boolean;
}

export class FlipBookEntry extends Schema {
  @type("string")
  type: string;

  @type("string")
  author: string;

  @type("string")
  value: string;
}

export class FlipBook extends Schema {
  @type("string")
  owner: string;

  @type("string")
  prompt: string;

  @type([FlipBookEntry])
  entries = new ArraySchema<FlipBookEntry>();
}

export class TeledrawSchema extends Schema {
  @type("string")
  code: string;

  @type("string")
  state: string;

  @type({ map: User })
  users = new MapSchema<User>();

  @type({ map: "string" })
  sessionName = new MapSchema<string>();

  @type("string")
  partyLeader: string;

  @type({ map: FlipBook })
  flipbooks = new MapSchema<FlipBook>();

  @type({ map: FlipBook })
  flipbookAssignments = new MapSchema<FlipBook>();

  @type(["string"])
  userOrder = new ArraySchema<string>();

  @type("number")
  rotations = 0;

  @type(FlipBook)
  reviewBook: FlipBook;
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
