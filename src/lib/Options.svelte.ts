// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2024 Jani Nikula <jani@nikula.org>

export type SavedName = {
  id: number;
  name: string;
};

// How many red balls to start with? Only three options, not arbitrary.
const modes: number[] = [6, 10, 15];

export class Options {
  names: SavedName[] = $state([]);
  private _savename: string;
  private _num_players: number;

  readonly mode_min: number = 0;
  readonly mode_max: number = modes.length - 1;
  mode: number = $state(this.mode_max);

  num_reds: number = $derived(modes[this.mode]);
  num_frames: number = $state(-1);

  private readonly RANDOM_FIRST_TO_BREAK: number;
  first_to_break: number = $state(0);

  constructor(saveprefix: string, num_players: number) {
    this._savename = `${saveprefix}-names`;
    this._num_players = num_players;

    if (num_players == 2)
      this.RANDOM_FIRST_TO_BREAK = num_players; // 0, 1, or random
    else
      this.RANDOM_FIRST_TO_BREAK = 1; // current or random order
    this.first_to_break = this.RANDOM_FIRST_TO_BREAK;

    this.reload();
  }

  reload(): void {
    let names: SavedName[] = this._load();

    if (names) {
      this.names = names;
    } else {
      names = [];
      for (let i = 0; i < this._num_players; i++)
	names.push({ id: i, name: `Player ${i + 1}`});

      this.names = names;
    }
  }

  // load names from local storage
  private _load(): SavedName[] {
    let names_json = localStorage.getItem(this._savename);
    if (!names_json)
      return null;

    try {
      let names = JSON.parse(names_json);

      if (!Array.isArray(names) || names.length != this._num_players)
	return null;

      return names;
    } catch (e) {
      return null;
    }
  }

  save(): void {
    localStorage.setItem(this._savename, JSON.stringify(this.names));
  }

  get randomize(): boolean {
    return this.first_to_break == this.RANDOM_FIRST_TO_BREAK;
  }

  valid_name(sn: SavedName): boolean {
    if (!sn.name)
      return false;

    let dupes = this.names.filter((x) => x.name.toUpperCase() === sn.name.toUpperCase());

    return dupes.length === 1;
  }

  private _all_valid(): boolean {
    return this.names.filter((x) => !this.valid_name(x)).length === 0;
  }

  can_new_game(): boolean {
    return this._all_valid();
  }
}
