// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2022 Jani Nikula <jani@nikula.org>

import * as timeutil from './time-util.ts';

export class Player {
  // game
  readonly pid: number;
  readonly name: string;
  frame_wins: number = 0;

  game_high_break: number = 0;
  game_balls: number = 0;
  private _game_pot_timestamp: number = 0;

  // frame
  points: number = 0;
  frame_high_break: number = 0;
  frame_balls: number = 0;
  private _frame_time: number = 0;
  private _frame_shots: number = 0;

  // turn
  _cur_break: number[] = [];
  _last_break: number[] = [];

  private _copy(source: Object): void {
    Object.assign(this, source);
  }

  constructor(pid: number, name: string, source: Object = null) {
    this.pid = pid;
    this.name = name;

    if (source)
      this._copy(source);
  }

  pot_points(points: number): void {
    this._game_pot_timestamp = Date.now()

    this.points += points;
    this._cur_break.push(points);

    const cur_break: number = this._cur_break.reduce((a, b) => a + b);

    // game stats
    this.game_balls++;
    this.game_high_break = Math.max(this.game_high_break, cur_break);

    // frame stats
    this.frame_balls++;
    this.frame_high_break = Math.max(this.frame_high_break, cur_break);
  }

  log_foul(points: number): void {
    this._cur_break.push(-points);
  }

  private _break_size(b: number[]): number {
    b = b.filter((v) => v > 0);

    if (b.length === 0)
      return 0;

    return b.reduce((a, b) => a + b);
  }

  get cur_break(): number {
    return this._break_size(this._cur_break);
  }

  get last_break(): number {
    return this._break_size(this._last_break);
  }

  end_turn(): void {
    this._last_break = [...this._cur_break];
    this._cur_break = [];
  }

  get frame_shot_time(): string {
    if (this._frame_shots == 0)
      return '';

    return timeutil.format_ms(this._frame_time / this._frame_shots);
  }

  get time_since_last_pot(): string {
    if (this._game_pot_timestamp == 0)
      return '';

    return timeutil.format_ms(Date.now() - this._game_pot_timestamp);
  }

  log_shot(duration: number, _value: number): void {
    this._frame_time += duration;
    this._frame_shots++;
  }

  new_frame(): void {
    this.points = 0;

    this._last_break = [];
    this._cur_break = [];
    this.frame_high_break = 0;
    this.frame_balls = 0;
    this._frame_time = 0;
    this._frame_shots = 0;
  }

  compare_frames(other: Player): number {
    return this.frame_wins - other.frame_wins;
  }
  compare(other: Player): number {
    return this.points - other.points;
  }
};
