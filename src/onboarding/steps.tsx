import type { ReactNode } from 'react'
import type { TourDevice } from '@/onboarding/store'

// 툴팁 위치. 'inside' 는 캔버스처럼 큰 대상 안쪽 중앙에 띄운다. target 이 없으면 화면 중앙 카드.
export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'inside'

export interface TourStep {
  id: string
  /** 하이라이트할 요소의 data-tour 값. 없으면 화면 중앙 안내 카드. */
  target?: string
  placement?: Placement
  title: string
  body: ReactNode
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

const WELCOME: TourStep = {
  id: 'welcome',
  title: 'Welcome to Whiteboard',
  body: (
    <p>
      Sketch system architecture diagrams — alone or together in real time. This quick tour walks you through the
      basics.
    </p>
  ),
}

const DESKTOP: TourStep[] = [
  WELCOME,
  {
    id: 'sidebar',
    target: 'sidebar',
    placement: 'right',
    title: 'Component library',
    body: (
      <>
        <p>Search for services, databases and tools.</p>
        <ul>
          <li>Drag an item onto the canvas to place it.</li>
          <li>Or click it to drop it in the middle of the view.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'canvas',
    target: 'canvas',
    placement: 'inside',
    title: 'Build your diagram',
    body: (
      <ul>
        <li>Hover a node and drag from one of its anchor dots to another node to connect them.</li>
        <li>Double-click a node, edge or group to edit its label.</li>
        <li>Drag across an empty area to select multiple items.</li>
      </ul>
    ),
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    placement: 'bottom',
    title: 'Toolbar',
    body: (
      <ul>
        <li>
          Undo / Redo — <kbd>{MOD}</kbd> <kbd>Z</kbd>
        </li>
        <li>
          <b>Group</b> — drag an empty area to wrap nodes in a group.
        </li>
        <li>
          <b>Grid</b> / <b>Snap</b> — show the grid and align to it. Hold <kbd>Alt</kbd> to invert snapping.
        </li>
      </ul>
    ),
  },
  {
    id: 'zoom',
    target: 'zoom',
    placement: 'top',
    title: 'Move around',
    body: (
      <ul>
        <li>Scroll to pan, or hold <kbd>Space</kbd> and drag.</li>
        <li>
          <kbd>{MOD}</kbd> + scroll (or pinch the trackpad) to zoom.
        </li>
        <li>Click the percentage to reset to 100%.</li>
      </ul>
    ),
  },
  {
    id: 'minimap',
    target: 'minimap',
    placement: 'top',
    title: 'Minimap',
    body: <p>See the whole board at a glance. Drag inside it to jump to another area.</p>,
  },
  {
    id: 'share',
    target: 'share',
    placement: 'bottom',
    title: 'Share',
    body: <p>Invite others with a link and edit the same board together in real time.</p>,
  },
  {
    id: 'sync',
    target: 'sync',
    placement: 'bottom',
    title: 'Sync status',
    body: <p>Shows whether changes are syncing live. Your work is always saved in this browser automatically.</p>,
  },
  {
    id: 'help',
    target: 'help',
    placement: 'bottom',
    title: 'Handy shortcuts',
    body: (
      <>
        <ul>
          <li>
            <kbd>{MOD}</kbd> <kbd>C</kbd> / <kbd>V</kbd> copy &amp; paste, <kbd>Delete</kbd> remove
          </li>
          <li>
            With an edge selected: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> line style, <kbd>D</kbd> arrow direction
          </li>
          <li>
            <kbd>Esc</kbd> cancel / clear selection
          </li>
        </ul>
        <p>You can replay this tour any time from here.</p>
      </>
    ),
  },
]

const MOBILE: TourStep[] = [
  WELCOME,
  {
    id: 'menu',
    target: 'menu',
    placement: 'bottom',
    title: 'Add components',
    body: (
      <>
        <p>Tap here to open the component library.</p>
        <ul>
          <li>Tap an item to add it to the canvas.</li>
          <li>Or press and drag it to where you want it.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'canvas',
    target: 'canvas',
    placement: 'inside',
    title: 'Build your diagram',
    body: (
      <ul>
        <li>Tap a node to select it, then drag one of its anchor dots onto another node to connect them.</li>
        <li>Double-tap a node, edge or group to edit its label.</li>
        <li>Drag an empty area with one finger to move around.</li>
      </ul>
    ),
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    placement: 'bottom',
    title: 'Toolbar',
    body: (
      <ul>
        <li>Undo / Redo your last changes.</li>
        <li>
          <b>Group</b> — then drag an empty area to wrap nodes in a group.
        </li>
        <li>
          <b>Grid</b> / <b>Snap</b> — show the grid and align to it.
        </li>
      </ul>
    ),
  },
  {
    id: 'zoom',
    target: 'zoom',
    placement: 'top',
    title: 'Zoom',
    body: <p>Use − and + to zoom. Tap the percentage to reset to 100%.</p>,
  },
  {
    id: 'share',
    target: 'share',
    placement: 'bottom',
    title: 'Share',
    body: <p>Invite others with a link and edit the same board together in real time.</p>,
  },
  {
    id: 'sync',
    target: 'sync',
    placement: 'bottom',
    title: 'Sync status',
    body: <p>Shows whether changes are syncing live. Your work is always saved on this device automatically.</p>,
  },
  {
    id: 'help',
    target: 'help',
    placement: 'bottom',
    title: "You're all set",
    body: <p>Tap here any time to replay this tour.</p>,
  },
]

export const TOUR_STEPS: Record<TourDevice, TourStep[]> = { desktop: DESKTOP, mobile: MOBILE }
