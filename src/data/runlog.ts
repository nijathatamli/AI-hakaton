// fake run for the landing page, swap with a real log from the tester later
export type LogLine = {
  t: string
  kind: 'observe' | 'act' | 'check' | 'flag'
  text: string
}

export const SAMPLE_RUN: LogLine[] = [
  { t: '00:00.0', kind: 'observe', text: 'Window found: "Cavern (DEBUG)" 1280x720' },
  { t: '00:00.4', kind: 'observe', text: 'Title screen. One button reads "Start".' },
  { t: '00:00.9', kind: 'act', text: 'click (640, 418)' },
  { t: '00:02.1', kind: 'observe', text: 'Player at bottom-left. Door on the right, key above a gap.' },
  { t: '00:02.3', kind: 'act', text: 'hold right 1.2s, tap space' },
  { t: '00:04.0', kind: 'check', text: 'frame diff 0.31, input accepted' },
  { t: '00:04.2', kind: 'act', text: 'tap space, hold right 0.6s' },
  { t: '00:06.8', kind: 'observe', text: 'Key collected. Counter still shows 0/1.' },
  { t: '00:06.9', kind: 'flag', text: 'HUD did not update after pickup' },
  { t: '00:07.5', kind: 'act', text: 'hold right 2.0s' },
  { t: '00:09.6', kind: 'check', text: 'frame diff 0.00 for 2.0s, inputs ignored' },
  { t: '00:11.6', kind: 'check', text: 'frame diff 0.00 for 4.0s' },
  { t: '00:11.7', kind: 'flag', text: 'Soft-lock: player clipped into the right wall' },
  { t: '00:11.9', kind: 'observe', text: 'Writing report with clip 00:06.8 to 00:11.7' },
]

export const SAMPLE_REPORT = {
  id: 'P1-0007',
  title: 'Player clips into the right wall after a long jump and cannot move',
  severity: 'Blocks progress',
  steps: ['Start a new game', 'Collect the key above the gap', 'Hold right for about two seconds against the wall'],
  expected: 'Player stops at the wall and can walk back.',
  actual: 'Player sinks half a tile into the wall. Movement and jump inputs are ignored. Frame diff stays at zero.',
  clip: '00:06.8 to 00:11.7',
}
