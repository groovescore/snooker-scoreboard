// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

import { writable } from 'svelte/store';

function shuffle(array: any[]): any[] {
  let result: any[] = [];

  while (array.length) {
    let index: number = Math.floor(Math.random() * array.length);

    result.push(array[index]);
    array.splice(index, 1);
  }

  return result;
}

export type SavedName = {
  id: number;
  name: string;
};

class Names {
  names: SavedName[];

  constructor() {
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

  _shuffle(): void {
    this.names = shuffle(this.names);
  }

  // load names from local storage
  _load(): SavedName[] {
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

  _save(): void {
    localStorage.setItem('groovescore-names', JSON.stringify(this.names));
  }

  valid_name(sn: SavedName): boolean {
    if (!sn.name)
      return false;

    let dupes = this.names.filter((x) => x.name.toUpperCase() === sn.name.toUpperCase());

    return dupes.length === 1;
  }

  _all_valid(): boolean {
    return this.names.filter((x) => !this.valid_name(x)).length === 0;
  }

  can_new_game(): boolean {
    return this._all_valid();
  }
}

function create_names(_names: Names) {
  let { set, update, subscribe } = writable(_names);

  return {
    set,
    update,
    subscribe,
    save: () => update((val) => { val._save(); return val; }),
    shuffle: () => update((val) => { val._shuffle(); return val; }),
  };
}

export const names = create_names(new Names());
