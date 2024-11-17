// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

import { State } from './State.ts';
import type { SavedName } from './Names.svelte.ts';

export type SaveGameId = {
  slot: number;
  timestamp: number;
};

export class Game {
  private undo_stack: State[] = $state([]);
  private undo_index: number = $state(-1);
  private _save_game_slot: number = $state(0);
  saved_games: SaveGameId[] = $state();

  private static _save_game_name_slot(slot: number): string {
    return `groovescore-save-${slot}`;
  }

  constructor() {
    this.saved_games = this._read_saved_games();
  }

  private _read_saved_games(): SaveGameId[] {
    let saved: SaveGameId[] = [];

    for (let slot of [0,1,2]) {
      let timestamp: number = 0;
      let json: string = localStorage.getItem(Game._save_game_name_slot(slot));

      if (json) {
	let source = JSON.parse(json);
	timestamp = source[0].timestamp; // first frame start time
      }

      saved.push({ slot: slot, timestamp: timestamp });
    }

    // newest to oldest, with unused (timestamp 0) being oldest
    saved.sort((s1: SaveGameId, s2: SaveGameId) => s2.timestamp - s1.timestamp);

    // save new game in the oldest slot
    this._save_game_slot = saved[saved.length - 1].slot;

    return saved;
  }

  save_game_name(): string {
    return Game._save_game_name_slot(this._save_game_slot);
  }

  save(): void {
    localStorage.setItem(this.save_game_name(), JSON.stringify(this.undo_stack));
  }

  // FIXME: handle failure to load properly
  load(slot: number): void {
    // save this in the same slot
    this._save_game_slot = slot;

    let json: string = localStorage.getItem(this.save_game_name());
    if (!json)
      return;

    let source = JSON.parse(json);

    for (let s of source)
      this.undo_stack.push(new State(null, s));

    this.undo_index = this.undo_stack.length - 1;
  }

  get state(): State {
    return this.undo_stack[this.undo_index];
  }

  get can_undo(): boolean {
    return this.undo_index > 0;
  }

  undo(): void {
    console.assert(this.can_undo);

    this.undo_index--;
  }

  get can_redo(): boolean {
    return this.undo_index + 1 < this.undo_stack.length;
  }

  redo(): void {
    console.assert(this.can_redo);

    this.undo_index++;
  }

  private _push(s: State = null): void {
    if (s === null)
      s = this.state.deepcopy();
    this.undo_stack.splice(++this.undo_index, this.undo_stack.length, s);
  }

  pot_ball(value: number): void {
    this._push();
    this.state.pot_ball(value);
    this.save();
  }

  plus_balls(): void {
    this._push();
    this.state.plus_balls();
    this.save();
  }

  minus_balls(): void {
    this._push();
    this.state.minus_balls();
    this.save();
  }

  commit_foul(value: number): void {
    this._push();
    this.state.commit_foul(value);
    this.save();
  }

  end_turn(): void {
    this._push();
    this.state.end_turn();
    this.save();
  }

  end_frame(): void {
    this._push();
    this.state.end_frame();
    this.save();
  }

  edit_points(pid: number, amount: number): void {
    this._push();
    this.state.player_edit_points(pid, amount);
    this.save();
  }

  new_frame(): void {
    this._push();
    this.state.new_frame();
    this.save();
  }

  new_game(names: SavedName[]): void {
    this._push(new State(names));
    // Note: Don't autosave before first shot
  }
};
