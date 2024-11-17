// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

import Player from './Player.ts';
import * as timeutil from './time-util.ts';
import type { SavedName } from './Names.svelte.ts';

const MAX_BALLS: number = 15 + 6;

class State {
  // game
  _break_off_pid: number = 0;
  num_frames: number = 0;

  // frame
  timestamp: number;
  _start_timestamp: number = 0;
  _end_timestamp: number = 0;
  _shot_timestamp: number = 0;
  _num_balls: number = MAX_BALLS;

  cur_pid: number = 0;
  red: boolean = false;
  foul: boolean = false;
  respot_black: boolean = false;
  _frame_over: boolean = false;

  players: Player[] = [];

  _copy(source: Object): void {
    // this will override players
    Object.assign(this, source);

    for (let i in this.players)
      this.players[i] = new Player(0, '', this.players[i]);
  }

  constructor(names: SavedName[] = null, source: Object = null) {
    // frame
    this.timestamp = Date.now()

    for (let pid of [0,1]) {
      let name: string;

      if (names && pid < names.length && names[pid].name && names[pid].name.length > 0)
	name = names[pid].name;
      else
	name = `player ${pid}`;

      let p: Player = new Player(pid, name);

      this.players.push(p)
    }

    if (source)
      this._copy(source);
  }

  deepcopy(): State {
    let source: Object = JSON.parse(JSON.stringify(this));

    return new State(null, source);
  }

  _get_player_by_pid(pid: number, other: boolean = false): Player {
    for (let p of this.players) {
      // FIXME: simplify
      if (other) {
	if (p.pid != pid)
	  return p;
      } else {
	if (p.pid == pid)
	  return p;
      }
    }

    console.assert(false, 'player by pid ' + pid + ' not found');

    return null;
  }

  _other_player_pid(): number {
    return (this.cur_pid + 1) % 2;
  }

  current_player(): Player {
    return this._get_player_by_pid(this.cur_pid);
  }

  other_player(): Player {
    return this._get_player_by_pid(this.cur_pid, true);
  }

  // All the statuses
  num_reds(): number {
    if (this._num_balls > 6)
      return this._num_balls - 6;
    else
      return 0
  }

  num_colors(): number {
    if (this._num_balls > 6)
      return 6;
    else
      return this._num_balls;
  }

  num_balls(value: number): number {
    if (value === 0)
      return this._num_balls;
    else if (value === 1)
      return this.num_reds();
    else if (this.num_colors() - (7 - value + 1) >= 0)
      return 1;
    else
      return 0;
  }

  num_points(): number {
    if (this.num_colors() === 0)
      return 0;

    const reds_and_blacks: number = this.num_reds() * (1 + 7);
    const colors: number = [2, 3, 4, 5, 6, 7].slice(-this.num_colors()).reduce((a, b) => a + b);

    return reds_and_blacks + colors;
  }

  get_players(): Player[] {
    return [...this.players];
  }

  // All the actions

  can_end_frame(): boolean {
    if (this._is_frame_over())
      return false;

    let player: Player = this.current_player();
    let other: Player = this.other_player();

    // can end frame if there's a point difference
    return player.points != other.points;
  }

  end_frame(): void {
    console.assert(this.can_end_frame());

    this._end_frame();
  }

  is_current_player(pid: number): boolean {
    if (this._is_frame_over())
      return false;

    return pid === this.cur_pid;
  }

  is_winner(pid: number): boolean {
    if (!this._is_frame_over())
      return false;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare(p2));
    return pid === players[1].pid;
  }

  _has_frame_started(): boolean {
    return this._start_timestamp != 0;
  }

  _detect_frame_over(): boolean {
    // snookers possible!
    if (this.num_colors() > 1)
      return false;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare(p2));

    return players[0].points + this.num_points() < players[1].points;
  }

  _is_frame_over(): boolean {
    return this._frame_over;
  }

  get_frame_time(): string {
    let frame_time: number;

    if (this._is_frame_over())
      frame_time = this._end_timestamp - this._start_timestamp;
    else if (this._has_frame_started())
      frame_time = Date.now() - this._start_timestamp;
    else
      frame_time = 0;

    return timeutil.format_ms(frame_time);
  }

  _log_shot(value: number): void {
    const now = Date.now();
    let shot_duration: number;

    if (this._has_frame_started()) {
      shot_duration = now - this._shot_timestamp;
    } else {
      // First shot, start the frame timer, use zero shot duration
      this._start_timestamp = now
      shot_duration = 0;
    }

    this._shot_timestamp = now;

    let p = this.current_player();
    p.log_shot(shot_duration, value);
  }

  _end_turn(): void {
    let p: Player = this.current_player();
    p.end_turn();

    this.red = false;
    this.foul = false;
    this.respot_black = false;

    this.cur_pid = this._other_player_pid();

    // end frame or respot black?
    if (this._detect_frame_over()) {
      this._end_frame();
    } else if (this.num_colors() === 0) {
      this._num_balls++;
      this.respot_black = true;
    }
  }

  _pot_points(points: number): void {
    this.foul = false;

    let p: Player = this.current_player();
    p.pot_points(points);

    if (this.num_points() === 0)
      this._end_turn();
  }

  _can_pot_red(): boolean {
    // Note: Can pot two reds at a time!
    return this.num_reds() > 0;
  }

  _pot_red(): void {
    console.assert(this._can_pot_red());

    this._num_balls--;
    this.red = true;

    this._pot_points(1);
  }

  _can_pot_color(value: number): boolean {
    if (this.red)
      return true;

    if (this.num_reds() > 0)
      return false;

    return this.num_colors() - (7 - value + 1) === 0;
  }

  _pot_color(value: number): void {
    console.assert(this._can_pot_color(value));

    if (this.num_reds() === 0 && !this.red)
      this._num_balls--;

    this.red = false;

    this._pot_points(value);
  }

  can_pot_ball(value: number): boolean {
    if (this._is_frame_over())
      return false;

    if (value === 1)
      return this._can_pot_red();
    else
      return this._can_pot_color(value);
  }

  pot_ball(value: number): void {
    console.log('pot ball: ' + value)

    this._log_shot(value);

    if (value === 1)
      this._pot_red();
    else
      this._pot_color(value);
  }

  can_commit_foul(value: number): boolean {
    if (this._is_frame_over())
      return false;

    return this.num_colors() - (7 - value + 1) >= 0;
  }

  commit_foul(value: number): void {
    console.assert(this.can_commit_foul(value));

    this._log_shot(-value);

    let player: Player = this.current_player();
    let other: Player = this.other_player();

    player.log_foul(value);
    other.points += value;

    // foul on last black, drop ball count to zero to cause end frame
    if (this.num_colors() === 1)
      this._num_balls--;

    this._end_turn();

    this.foul = true;
  }

  can_end_turn(): boolean {
    return !this._is_frame_over();
  }

  end_turn(): void {
    this._log_shot(0);
    this._end_turn();
  }

  _end_frame(): void {
    this._end_timestamp = Date.now();

    this._frame_over = true;
    this.num_frames++;

    const players: Player[] = [...this.players].sort((p1, p2) => p1.compare(p2));
    players[1].frame_wins++;
  }

  can_new_frame(): boolean {
    return this._is_frame_over();
  }

  new_frame(): void {
    // frame
    this.timestamp = Date.now();
    this._start_timestamp = 0;
    this._end_timestamp = 0;
    this._shot_timestamp = 0;
    this._num_balls = MAX_BALLS;

    this.red = false;
    this.foul = false;
    this.respot_black = false;
    this._frame_over = false;

    for (let p of this.players) {
      p.new_frame();
    }

    this._break_off_pid = (this._break_off_pid + 1) % 2;
    this.cur_pid = this._break_off_pid;
  }

  can_plus_balls(): boolean {
    return !this._is_frame_over() && this._num_balls < MAX_BALLS;
  }

  plus_balls(): void {
    console.log('plus balls');
    console.assert(this.can_plus_balls());

    this._num_balls++;
  }

  can_minus_balls(): boolean {
    return !this._is_frame_over() && this._num_balls > 0;
  }

  minus_balls(): void {
    console.log('minus balls');
    console.assert(this.can_minus_balls());

    this._num_balls--;
  }

  can_player_edit_points(pid: number, amount: number): boolean {
    if (this._is_frame_over())
      return false;

    let p: Player = this._get_player_by_pid(pid);

    return p.points + amount >= 0;
  }

  player_edit_points(pid: number, amount: number): void {
    console.assert(this.can_player_edit_points(pid, amount));

    let p: Player = this._get_player_by_pid(pid);

    // FIXME: maybe don't adjust player points here directly
    p.points = p.points + amount;
  }
}

export default State;
