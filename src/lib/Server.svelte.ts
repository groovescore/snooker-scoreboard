// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2024 Jani Nikula <jani@nikula.org>

import type { Game } from './Game.svelte.ts';

export class Server {
  private server_url: string;
  private server_auth: string;

  fixtures: any = $state(null);

  constructor(server_url: string, server_auth: string) {
    this.server_url = server_url;
    this.server_auth = server_auth;
  }

  get_groups(): string[] {
    let groups: Set<string> = new Set();

    if (!this.fixtures)
      return [];

    for (let match of this.fixtures.matches) {
      groups.add(match.group);
    }

    return [...groups.values()].sort();
  }

  get_matches(group: string) {
    let matches = [];

    if (!this.fixtures)
      return [];

    for (let match of this.fixtures.matches) {
      if (match.group === group)
	matches.push(match);
    }

    return matches;
  }

  async get_fixtures() {
    // FIXME: use ?completed=false to limit results
    const url: string = `${this.server_url}/api/v2/matches`;
    const headers: Headers = new Headers();

    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'text/plain');
    headers.append('Authorization', `Basic ${this.server_auth}`);

    await fetch(url, {
      headers: headers,
    }).then((response) => {
      if (!response.ok)
	throw new Error(`Response status ${response.status}`);

      return response.json();
    }).then((data) => {
      // FIXME: API compatibility check?
      this.fixtures = data;
    }).catch((error) => {
      // FIXME: report errors to user?
      console.error("GET fixtures error:", error);
    });
  }

  async post_scores(game: Game) {
    const url: string = `${this.server_url}/api/v2/scores/${game.state.league_match_id}`
    const headers: Headers = new Headers();

    headers.append('Accept', 'application/json');
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', Basic `${this.server_auth}`);

    let frames: number[] = [0, 0];
    let breaks: number[] = [0, 0];

    for (let player of game.state.get_players()) {
      frames[player.pid] = player.frame_wins;
      breaks[player.pid] = player.game_high_break;
    }

    // FIXME: don't post 0 breaks!
    const body: string = JSON.stringify({
      'breaks': [
	{
          'player': 'player1',
          'points': breaks[0]
	},
	{
          'player': 'player2',
          'points': breaks[1]
	}
      ],
      'player1_score': frames[0],
      'player2_score': frames[1]
    });

    console.log(`POST scores: ${body}`);

    await fetch(url, {
	method: 'POST',
	headers: headers,
	body: body,
    }).then((response) => {
      if (!response.ok)
	throw new Error(`Response status ${response.status}`);

      return response.json();
    }).then((data) => {
      // FIXME: do we need to do something with this?
      console.log(data);
    }).catch((error) => {
      // FIXME: report errors to user?
      console.error("POST scores error:", error);
    });
  }
}
