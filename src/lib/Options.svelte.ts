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

  static readonly RANDOM_FIRST_TO_BREAK = 2;
  first_to_break: number = $state(Options.RANDOM_FIRST_TO_BREAK);

  // Server details
  server_url: string = null;
  server_auth: string = null;

  // League match
  play_league_match: number = $state(0);
  selected_group = $state(null);
  selected_match = $state(null);

  constructor() {
    const params: URLSearchParams = new URLSearchParams(document.location.search);
    const url: string = params.get('url');
    const key: string = params.get('key');

    this.reload();

    // Override any loaded ones
    if (url && key) {
      this.server_url = url;
      this.server_auth = key;
      this.save_server_info();
    }
  }

  reload(): void {
    let names: SavedName[] = this.load_names();

    if (names) {
      this.names = names;
    } else {
      names = [];
      for (let i of [0, 1])
	names.push({ id: i, name: `Player ${i + 1}`});

      this.names = names;
    }

    this.load_server_info();
  }

  setup_league_match(): void {
    if (!this.selected_match)
      return;

    // FIXME: better mapping of player ids
    this.names[0].name = this.selected_match.player1;
    this.names[1].name = this.selected_match.player2;
    this.set_reds(Number(this.selected_match.format.num_reds));
    this.num_frames = Number(this.selected_match.format.best_of);
  }

  private set_reds(num_reds: number) {
    let mode: number = modes.indexOf(num_reds);

    if (mode >= 0)
      this.mode = mode;
  }

  // load names from local storage
  private load_names(): SavedName[] {
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

  private save_server_info(): void {
    if (this.server_url && this.server_auth) {
      localStorage.setItem('groovescore-server-url', JSON.stringify(this.server_url));
      localStorage.setItem('groovescore-server-auth', JSON.stringify(this.server_auth));
    }
  }

  private load_server_info(): void {
    let server_url: string = localStorage.getItem('groovescore-server-url');
    let server_auth: string = localStorage.getItem('groovescore-server-auth');

    if (server_url && server_auth) {
      this.server_url = JSON.parse(server_url);
      this.server_auth = JSON.parse(server_auth);
    }
  }

  save(): void {
    localStorage.setItem('groovescore-names', JSON.stringify(this.names));
    this.save_server_info();
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
    if (this.play_league_match) {
      if (!this.selected_match || !this.selected_match.id)
	return false;
    }

    return this._all_valid();
  }
}
