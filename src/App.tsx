import {
  createEffect,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore, produce } from "solid-js/store";

type Point = { x: number; y: number };
type Input = (typeof knownKeys)[number];
type State = {
  player: Point & { hasApple: boolean };
  apple: Point;
  box: Point & { apples: number };
  done: boolean;
};

const knownKeys = ["w", "a", "s", "d"] as const;
const inputLength = 3;
const speed = 200;
const targetApples = 4;
const width = 5;
const height = 10;

function isEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function rand(max = Number.MAX_VALUE, min = 0): number {
  return Math.floor(Math.random() * max + min) - min;
}

function positionToCss(position: Point): JSX.CSSProperties {
  return { "--x": position.x, "--y": position.y };
}

function norm(n: number) {
  return Math.min(1, Math.max(-1, n));
}

function inputToDelta(input: Input): Point {
  switch (input) {
    case "w":
      return { x: 0, y: -1 };
    case "d":
      return { x: +1, y: 0 };
    case "s":
      return { x: 0, y: +1 };
    case "a":
      return { x: -1, y: 0 };
  }
}

function createThrottle(callback: any, wait = 200) {
  const [getIsThrottled, setIsThrottled] = createSignal(false);
  return function (...args: any[]) {
    if (!getIsThrottled()) {
      setIsThrottled(true);
      callback(...args);
      setTimeout(() => setIsThrottled(false), wait);
    }
  };
}

function App() {
  const [input, setInput] = createStore<Input[]>([]);
  const [getAnimating, setAnimating] = createSignal(false);
  const [state, setState] = createStore<State>({
    player: { x: 0, y: 0, hasApple: false },
    box: { x: rand(width), y: rand(height), apples: 0 },
    apple: { x: rand(width), y: rand(height) },
    done: false,
  });

  function GameLoop() {
    if (state.done) return;
    if (input.length === 0) return;
    if (getAnimating()) return;
    setAnimating(true);
    const [next, ...rest] = input;
    setInput(rest);
    setState(
      produce((state) => {
        const delta = inputToDelta(next);

        if (state.player.x + delta.x < 0) return;
        if (state.player.y + delta.y < 0) return;

        state.player.x += delta.x;
        state.player.y += delta.y;
        state.player.hasApple =
          state.player.hasApple || isEqual(state.player, state.apple);

        if (state.player.hasApple) {
          state.apple.x = state.player.x;
          state.apple.y = state.player.y;
        }

        if (state.player.hasApple && isEqual(state.player, state.box)) {
          state.player.hasApple = false;
          state.box.apples += 1;
          do {
            state.apple.x = rand(width);
            state.apple.y = rand(height);
          } while (isEqual(state.apple, state.box));
        }

        if (state.box.apples >= targetApples) {
          state.player.hasApple = false;
          state.player.y += 1;
          state.done = true;
        }
      }),
    );
    setTimeout(() => setAnimating(false), speed);
  }

  function addInput(key: string): void {
    setInput((keys) =>
      knownKeys.includes(key as Input)
        ? ([...keys, key].slice(-inputLength) as Input[])
        : keys,
    );
  }

  function onKeyDown({ key }: KeyboardEvent): void {
    addInput(key);
  }

  function onKeyUp(): void {
    setInput([]);
  }

  const [, setPointer] = createSignal<undefined | Point>();

  function onTouchStart(event: TouchEvent) {
    const { clientX: x, clientY: y } = event.targetTouches[0];
    setPointer({ x, y });
  }

  function onTouchMove(event: TouchEvent) {
    setPointer((pointer) => {
      if (!pointer) return;
      const { clientX: x, clientY: y } =
        event.changedTouches[event.changedTouches.length - 1];
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      if (Math.abs(dy) > Math.abs(dx))
        switch (norm(dy)) {
          case -1:
            addInput("w");
            break;
          case +1:
            addInput("s");
            break;
        }
      if (Math.abs(dx) > Math.abs(dy))
        switch (norm(dx)) {
          case -1:
            addInput("a");
            break;
          case +1:
            addInput("d");
            break;
        }
      return { x: pointer.x + dx / 2, y: pointer.y + dy / 2 };
    });
  }

  function onTouchEnd(_: TouchEvent) {
    setPointer(undefined);
    setInput([]);
  }

  createEffect(GameLoop);

  const _onTouchMove = createThrottle(onTouchMove);
  onMount(() => {
    document.documentElement.style.setProperty("--speed", speed.toString());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", _onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    setState(
      produce((state) => {
        do {
          state.apple.x = rand(width);
          state.apple.y = rand(height);
        } while (
          isEqual(state.apple, state.box) ||
          isEqual(state.apple, state.player)
        );
      }),
    );

    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", _onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    });
  });

  function onFullScreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  return (
    <>
      <main>
        <div class="box positioned" style={positionToCss(state.box)}>
          <For each={Array(state.box.apples)}>
            {() => <div class="apple" />}
          </For>
        </div>
        <div class="player positioned" style={positionToCss(state.player)} />
        <Show
          when={!state.done}
          fallback={
            <dialog open>
              <h1>You Win!</h1>
            </dialog>
          }
        >
          <Show
            when={state.player.hasApple}
            fallback={
              <div
                class="apple positioned"
                style={positionToCss(state.apple)}
              />
            }
          >
            <div class="apple positioned" style={positionToCss(state.apple)} />
          </Show>
        </Show>
      </main>
      <aside>
        <button onClick={onFullScreen}>Fullscreen</button>
      </aside>
    </>
  );
}

export default App;
