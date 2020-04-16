"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
class User extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        this.name = "";
        this.isPresent = false;
    }
}
__decorate([
    schema_1.type("string")
], User.prototype, "sessionId", void 0);
__decorate([
    schema_1.type("string")
], User.prototype, "name", void 0);
__decorate([
    schema_1.type("boolean")
], User.prototype, "isPresent", void 0);
exports.User = User;
class FlipbookEntry extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.type = "";
        this.author = "";
        this.value = "";
        this.doShowReview = false;
    }
}
__decorate([
    schema_1.type("string")
], FlipbookEntry.prototype, "type", void 0);
__decorate([
    schema_1.type("string")
], FlipbookEntry.prototype, "author", void 0);
__decorate([
    schema_1.type("string")
], FlipbookEntry.prototype, "value", void 0);
__decorate([
    schema_1.type("boolean")
], FlipbookEntry.prototype, "doShowReview", void 0);
exports.FlipbookEntry = FlipbookEntry;
class Flipbook extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.owner = "";
        this.prompt = "";
        this.entries = new schema_1.ArraySchema();
    }
}
__decorate([
    schema_1.type("string")
], Flipbook.prototype, "owner", void 0);
__decorate([
    schema_1.type("string")
], Flipbook.prototype, "prompt", void 0);
__decorate([
    schema_1.type([FlipbookEntry])
], Flipbook.prototype, "entries", void 0);
exports.Flipbook = Flipbook;
class TeledrawSchema extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.code = "";
        this.state = "";
        this.users = new schema_1.MapSchema();
        this.sessionName = new schema_1.MapSchema();
        this.partyLeader = "";
        this.flipbooks = new schema_1.MapSchema();
        this.flipbookAssignments = new schema_1.MapSchema();
        this.userOrder = new schema_1.ArraySchema();
        this.rotations = 0;
        this.reviewBook = "";
    }
}
__decorate([
    schema_1.type("string")
], TeledrawSchema.prototype, "code", void 0);
__decorate([
    schema_1.type("string")
], TeledrawSchema.prototype, "state", void 0);
__decorate([
    schema_1.type({ map: User })
], TeledrawSchema.prototype, "users", void 0);
__decorate([
    schema_1.type({ map: "string" })
], TeledrawSchema.prototype, "sessionName", void 0);
__decorate([
    schema_1.type("string")
], TeledrawSchema.prototype, "partyLeader", void 0);
__decorate([
    schema_1.type({ map: Flipbook })
], TeledrawSchema.prototype, "flipbooks", void 0);
__decorate([
    schema_1.type({ map: "string" })
], TeledrawSchema.prototype, "flipbookAssignments", void 0);
__decorate([
    schema_1.type(["string"])
], TeledrawSchema.prototype, "userOrder", void 0);
__decorate([
    schema_1.type("number")
], TeledrawSchema.prototype, "rotations", void 0);
__decorate([
    schema_1.type("string")
], TeledrawSchema.prototype, "reviewBook", void 0);
exports.TeledrawSchema = TeledrawSchema;
var EntryType;
(function (EntryType) {
    EntryType["Draw"] = "draw";
    EntryType["Guess"] = "guess";
})(EntryType = exports.EntryType || (exports.EntryType = {}));
var GameState;
(function (GameState) {
    GameState["Lobby"] = "lobby";
    GameState["Playing"] = "playing";
    GameState["Reviewing"] = "reviewing";
})(GameState = exports.GameState || (exports.GameState = {}));
