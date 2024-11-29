// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

export type SavedName = {
  id: number;
  name: string;
};

// How many red balls to start with? Only three options, not arbitrary.
const modes: number[] = [6, 10, 15];

export class Options {
  names: SavedName[] = $state();

  readonly mode_min: number = 0;
  readonly mode_max: number = modes.length - 1;
  mode: number = $state(this.mode_max);

  num_reds: number = $derived(modes[this.mode]);
  num_frames: number = $state(-1);

  constructor() {
    this.reload();
  }

  reload(): void {
    let names: SavedName[] = this._load();

    if (names) {
      this.names = names;
    } else {
      names = [];
      for (let i of [0, 1])
	names.push({ id: i, name: `Player ${i + 1}`});

      this.names = names;
    }
  }

  // load names from local storage
  private _load(): SavedName[] {
    let names_json = localStorage.getItem('groovescore-names');
    if (!names_json)
      return null;

    try {
      let names = JSON.parse(names_json);

      if (!Array.isArray(names) || names.length != 2)
	return null;

      return names;
    } catch (e) {
      return null;
    }
  }

  save(): void {
    localStorage.setItem('groovescore-names', JSON.stringify(this.names));
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
