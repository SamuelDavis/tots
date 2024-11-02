import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

type Point = { x: number; y: number };

const inputLength = 3;
const speed = 200;

function getPositionStyles(position: Point) {
  return {
    "--x": position.x,
    "--y": position.y,
  };
}

function isEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function App() {
  const [getPlayerHasApple, setPlayerHasApple] = createSignal(false);
  const [getAnimating, setAnimating] = createSignal(false);
  const [getInput, setInput] = createSignal<Point[]>([]);
  const [getPlayerPosition, setPlayerPosition] = createSignal<Point>({
    x: 0,
    y: 0,
  });
  const [getApplePosition, setApplePosition] = createSignal<Point>({
    x: 5,
    y: 2,
  });
  const [getBoxPosition] = createSignal<Point>({
    x: 2,
    y: 7,
  });
  const getPlayerStyles = createMemo(() => ({
    ...getPositionStyles(getPlayerPosition()),
    "--speed": speed,
  }));
  const getAppleStyles = createMemo(() =>
    getPositionStyles(getApplePosition()),
  );
  const getBoxStyles = createMemo(() => getPositionStyles(getBoxPosition()));
  const move = (delta: Point) =>
    setInput((prev) => [...prev, delta].slice(-inputLength));

  createEffect(() => {
    if (getInput().length === 0) return;
    if (getAnimating()) return;
    setAnimating(true);
    const [delta, ...rest] = getInput();
    setPlayerPosition((position) => ({
      x: position.x + delta.x,
      y: position.y + delta.y,
    }));
    setInput(rest);
    setTimeout(() => setAnimating(false), speed);
  });

  createEffect(() => {
    const player = getPlayerPosition();
    const apple = getApplePosition();
    setPlayerHasApple((hasApple) => hasApple || isEqual(player, apple));
  });

  createEffect(() => {
    if (getPlayerHasApple()) setApplePosition(getPlayerPosition());
  });

  createEffect(() => {
    if (getPlayerHasApple() && isEqual(getPlayerPosition(), getBoxPosition())) {
      setPlayerHasApple(false);
    }
  });

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "w":
        move({ x: 0, y: -1 });
        break;
      case "d":
        move({ x: 1, y: 0 });
        break;
      case "s":
        move({ x: 0, y: +1 });
        break;
      case "a":
        move({ x: -1, y: 0 });
        break;
    }
  }

  function onKeyUp() {
    setInput([]);
  }

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  });

  return (
    <main>
      <div class="box positioned" style={getBoxStyles()} />
      <div class="player positioned" style={getPlayerStyles()} />
      <div class="apple positioned" style={getAppleStyles()} />
    </main>
  );
}

export default App;
