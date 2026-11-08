import type { GameId } from "./game";
export type Lang = "en" | "ru";
export type World = {
  id: GameId;
  title: string;
  number: string;
  genre: Record<Lang, string>;
  tagline: Record<Lang, string>;
  description: Record<Lang, string>;
  goal: Record<Lang, string>;
  instructions: Record<Lang, string>;
  touchInstructions: Record<Lang, string>;
  objectiveLabel: Record<Lang, string>;
  actionLabel: Record<Lang, string>;
  winText: Record<Lang, string>;
  accent: string;
  ink: string;
  cover: string;
};
const worldSeeds: Omit<
  World,
  | "instructions"
  | "touchInstructions"
  | "objectiveLabel"
  | "actionLabel"
  | "winText"
>[] = [
  {
    id: "dusk-delivery",
    title: "DUSK DELIVERY",
    number: "001",
    genre: { en: "COURIER / CITY", ru: "КУРЬЕР / ГОРОД" },
    tagline: {
      en: "One last parcel before the city goes dark.",
      ru: "Последняя посылка, пока город не уснул.",
    },
    description: {
      en: "A courier crosses rooftop bridges and sleepy backstreets under a tangerine sky. Every address hides a different story.",
      ru: "Курьер пересекает мосты между крышами и сонные переулки под мандариновым небом. За каждым адресом — новая история.",
    },
    goal: {
      en: "Follow the orange lights across the city.",
      ru: "Следуй за оранжевыми огнями через город.",
    },
    accent: "#d66544",
    ink: "#41233e",
    cover: "dusk",
  },
  {
    id: "orbit-zero",
    title: "ORBIT ZERO",
    number: "002",
    genre: { en: "SPACE / EXPLORATION", ru: "КОСМОС / ИССЛЕДОВАНИЕ" },
    tagline: {
      en: "The ring is broken. The journey isn’t.",
      ru: "Кольцо разрушено. Путешествие продолжается.",
    },
    description: {
      en: "A tiny survey ship traces the remains of an orbital ring. Between the fragments: quiet signals, forgotten stations and a blue world below.",
      ru: "Маленький корабль исследует обломки орбитального кольца. Между ними — тихие сигналы, забытые станции и голубая планета внизу.",
    },
    goal: {
      en: "Explore the fragments of the orbital ring.",
      ru: "Исследуй обломки орбитального кольца.",
    },
    accent: "#527ac5",
    ink: "#121b46",
    cover: "orbit",
  },
  {
    id: "moss-signal",
    title: "MOSS SIGNAL",
    number: "003",
    genre: { en: "EXPLORE / PUZZLE", ru: "ИССЛЕДОВАНИЕ / ГОЛОВОЛОМКА" },
    tagline: {
      en: "A small robot. A sleeping forest. Three signals to bring it back.",
      ru: "Маленький робот. Спящий лес. Три сигнала, чтобы его разбудить.",
    },
    description: {
      en: "Find three old beacons among the overgrown ruins. Restore their signals, then reach the stone portal. A short original game, made for this collection.",
      ru: "Найди три старых маяка среди заросших руин. Восстанови сигналы и доберись до каменного портала. Короткая авторская игра для этой коллекции.",
    },
    goal: {
      en: "Restore three signals. Reach the portal.",
      ru: "Включи три маяка. Доберись до портала.",
    },
    accent: "#b4bc46",
    ink: "#103e32",
    cover: "moss",
  },
  {
    id: "tidebound",
    title: "TIDEBOUND",
    number: "004",
    genre: { en: "COAST / ADVENTURE", ru: "ПОБЕРЕЖЬЕ / ПРИКЛЮЧЕНИЕ" },
    tagline: {
      en: "A lighthouse, a little boat and a very long tide.",
      ru: "Маяк, маленькая лодка и долгий прилив.",
    },
    description: {
      en: "Past the red lighthouse, the sea opens into a chain of weather-worn islands. Read the water, follow the coastline and keep the light in sight.",
      ru: "За красным маяком море превращается в цепь обветренных островов. Читай воду, следуй вдоль берега и не теряй свет из виду.",
    },
    goal: {
      en: "Find a safe passage along the coastline.",
      ru: "Найди безопасный путь вдоль побережья.",
    },
    accent: "#2c8e9a",
    ink: "#113d50",
    cover: "tide",
  },
  {
    id: "ember-vault",
    title: "EMBER VAULT",
    number: "005",
    genre: { en: "DUNGEON / MYSTERY", ru: "ПОДЗЕМЕЛЬЕ / ТАЙНА" },
    tagline: {
      en: "A warm light behind a door no one remembers.",
      ru: "Тёплый свет за давно забытой дверью.",
    },
    description: {
      en: "Stone doors, a brass key and rooms lit by the last embers. An underground journey told through traces left in the walls.",
      ru: "Каменные двери, латунный ключ и комнаты в свете последних углей. Подземное путешествие по следам на древних стенах.",
    },
    goal: {
      en: "Follow the embers to the sealed vault.",
      ru: "Следуй за углями к запечатанному хранилищу.",
    },
    accent: "#b95937",
    ink: "#441c2c",
    cover: "ember",
  },
  {
    id: "snowbyte",
    title: "SNOWBYTE",
    number: "006",
    genre: { en: "MOUNTAIN / DISCOVERY", ru: "ГОРЫ / ОТКРЫТИЯ" },
    tagline: {
      en: "The last cable car takes the scenic route.",
      ru: "Последняя кабина идёт самым красивым путём.",
    },
    description: {
      en: "A mountain station sits above the clouds. Trace the cable, listen for the bell and discover a small world beneath a very big sky.",
      ru: "Горная станция возвышается над облаками. Следуй вдоль каната, прислушивайся к колоколу и открывай маленький мир под огромным небом.",
    },
    goal: {
      en: "Travel between the snow-covered stations.",
      ru: "Путешествуй между заснеженными станциями.",
    },
    accent: "#8981c1",
    ink: "#322b59",
    cover: "snow",
  },
];
const originalWords = {
  en: {
    collection: "Collection",
    about: "About",
    six: "SIX SMALL WORLDS",
    headline: "PICK YOUR\nNEXT WORLD.",
    intro: "A playable collection\nof imaginary worlds.",
    open: "OPEN BOX",
    back: "Back to shelf",
    prev: "Previous world",
    next: "Next world",
    browse: "DRAG TO BROWSE",
    soundOff: "Sound off",
    soundOn: "Sound on",
    footer: "A small archive. A new adventure.",
    concept: "Original world concept",
    demo: "Original playable demo",
    insert: "INSERT & START",
    explore: "EXPLORE WORLD",
    inspect: "Inspect cartridge",
    move: "MOVE",
    activate: "ACTIVATE",
    portal: "RETURN",
    loading: "Preparing the console…",
    modelError:
      "The 3D console could not load. The collection and game still work in the light view.",
    retry: "Retry 3D",
    light: "Light view",
    ready: "CARTRIDGE READY",
    playing: "PLAYING DEMO",
    paused: "GAME PAUSED",
    complete: "SIGNAL RESTORED",
    resume: "Resume",
    again: "Start again",
    pause: "Pause",
    fullscreen: "Larger game screen",
    shrink: "Return to console",
    signals: "Signals",
    interact: "Get close to a beacon, then press E.",
    allSignals: "All three signals are back. Find the portal.",
    notNear: "Move closer to an unlit beacon.",
    found: "Signal restored.",
    finish: "The forest is awake again.",
    art: "ARTWORK",
    details: "WORLD NOTES",
    previous: "Previous detail",
    nextDetail: "Next detail",
    worldView: "Concept view",
    conceptNote: "An illustrated world concept, not a playable full game.",
    aboutTitle: "Small boxes. Real curiosity.",
    aboutCopy:
      "SAVE SLOT is an independent portfolio experiment by Beibars Ileskhan. Six imagined game worlds become physical objects you can open and explore. MOSS SIGNAL is a real, short game; the other five are illustrated concepts.",
    portfolio: "Visit my portfolio",
    close: "Close",
    controls: "Arrows / WASD · E to activate · Esc to pause",
    touch: "Move with the pad. Tap Activate near a beacon.",
    saved: "Your progress stays in this browser session.",
    restored: "Progress restored",
    emptyScreen: "Choose a world. Insert a story.",
    restartAsk:
      "Restart MOSS SIGNAL? Your three signals and position will reset.",
    yesRestart: "Restart",
    cancel: "Keep playing",
    unavailable:
      "3D is unavailable. You can still browse all six worlds and play MOSS SIGNAL.",
    select: "Choose a world",
    viewMap: "MAP",
    viewArt: "LANDSCAPE",
    viewStory: "STORY",
    notes: ["The journey", "The landscape", "The idea"],
  },
  ru: {
    collection: "Коллекция",
    about: "О проекте",
    six: "ШЕСТЬ МАЛЕНЬКИХ МИРОВ",
    headline: "ВЫБЕРИ СВОЙ\nСЛЕДУЮЩИЙ МИР.",
    intro: "Коллекция вымышленных миров,\nв один из которых можно сыграть.",
    open: "ОТКРЫТЬ КОРОБКУ",
    back: "Назад к полке",
    prev: "Предыдущий мир",
    next: "Следующий мир",
    browse: "ЛИСТАЙ ПЕРЕТАСКИВАНИЕМ",
    soundOff: "Звук выкл",
    soundOn: "Звук вкл",
    footer: "Маленький архив. Новое приключение.",
    concept: "Авторский концепт мира",
    demo: "Настоящая игровая демка",
    insert: "ВСТАВИТЬ И ИГРАТЬ",
    explore: "ИССЛЕДОВАТЬ МИР",
    inspect: "Рассмотреть картридж",
    move: "ДВИЖЕНИЕ",
    activate: "ВКЛЮЧИТЬ",
    portal: "ПОРТАЛ",
    loading: "Подготавливаем консоль…",
    modelError:
      "3D-консоль не загрузилась. Коллекция и игра доступны в лёгком режиме.",
    retry: "Повторить 3D",
    light: "Лёгкий режим",
    ready: "КАРТРИДЖ ГОТОВ",
    playing: "ИГРАЕМ В ДЕМКУ",
    paused: "ИГРА НА ПАУЗЕ",
    complete: "СИГНАЛ ВОССТАНОВЛЕН",
    resume: "Продолжить",
    again: "Начать заново",
    pause: "Пауза",
    fullscreen: "Увеличить экран игры",
    shrink: "Вернуться к консоли",
    signals: "Маяки",
    interact: "Подойди к маяку и нажми E.",
    allSignals: "Все три маяка включены. Найди портал.",
    notNear: "Подойди ближе к неактивному маяку.",
    found: "Маяк включён.",
    finish: "Лес снова проснулся.",
    art: "ИЛЛЮСТРАЦИЯ",
    details: "О МИРЕ",
    previous: "Предыдущая деталь",
    nextDetail: "Следующая деталь",
    worldView: "Просмотр концепта",
    conceptNote: "Иллюстрированный концепт мира, а не полная игра.",
    aboutTitle: "Маленькие коробки. Настоящее любопытство.",
    aboutCopy:
      "SAVE SLOT — самостоятельный проект Бейбарса Ілесхана для портфолио. Шесть вымышленных игровых миров становятся предметами, которые можно открыть и исследовать. MOSS SIGNAL — настоящая короткая игра; остальные пять — иллюстрированные концепты.",
    portfolio: "Моё портфолио",
    close: "Закрыть",
    controls: "Стрелки / WASD · E — включить · Esc — пауза",
    touch: "Двигайся крестовиной. Рядом с маяком нажми «Включить».",
    saved: "Прогресс сохраняется на время этой сессии браузера.",
    restored: "Прогресс восстановлен",
    emptyScreen: "Выбери мир. Вставь историю.",
    restartAsk:
      "Начать MOSS SIGNAL заново? Маяки и положение робота сбросятся.",
    yesRestart: "Начать заново",
    cancel: "Продолжить",
    unavailable:
      "3D недоступно. Все шесть миров и демка MOSS SIGNAL по-прежнему доступны.",
    select: "Выбрать мир",
    viewMap: "КАРТА",
    viewArt: "ПЕЙЗАЖ",
    viewStory: "ИСТОРИЯ",
    notes: ["Путешествие", "Пейзаж", "Идея"],
  },
} as const;

const gameplay: Record<
  GameId,
  {
    instructions: Record<Lang, string>;
    touchInstructions: Record<Lang, string>;
    objectiveLabel: Record<Lang, string>;
    actionLabel: Record<Lang, string>;
    winText: Record<Lang, string>;
    goal: Record<Lang, string>;
    description: Record<Lang, string>;
  }
> = {
  "dusk-delivery": {
    instructions: {
      en: "Deliver to the three numbered doors with E. Cross the two traffic lanes carefully, then return to the depot at bottom left.",
      ru: "Доставь посылки к трём дверям: подойди и нажми E. Осторожно пересекай дороги, затем вернись на склад слева внизу.",
    },
    touchInstructions: {
      en: "Hold the on-screen arrows to move. At each numbered door, tap DELIVER. Avoid traffic, then return to the depot at bottom left.",
      ru: "Двигайся экранными стрелками. У трёх дверей нажми «ДОСТАВИТЬ». Избегай машин и вернись на склад слева внизу.",
    },
    objectiveLabel: { en: "DELIVERIES", ru: "ДОСТАВКИ" },
    actionLabel: { en: "DELIVER", ru: "ДОСТАВИТЬ" },
    winText: {
      en: "Every parcel is home. Your shift is over.",
      ru: "Все посылки доставлены. Смена окончена.",
    },
    goal: {
      en: "Deliver three parcels. Return to the depot.",
      ru: "Доставь три посылки. Вернись на склад.",
    },
    description: {
      en: "A playable night courier route. Visit three glowing doors, dodge moving traffic and make it back to the depot. Delivered parcels stay safe after a collision.",
      ru: "Ночной маршрут курьера. Найди три светящиеся двери, избегай машин и вернись на склад. Доставленные посылки сохраняются после столкновения.",
    },
  },
  "orbit-zero": {
    instructions: {
      en: "Steer with arrows / WASD. Collect three energy cells, then dock at bottom left. You drift: press E to brake before docking. Avoid asteroids.",
      ru: "Управляй стрелками / WASD. Собери три батареи и пристыкуйся слева внизу. Корабль движется по инерции: E тормозит. Избегай астероидов.",
    },
    touchInstructions: {
      en: "Steer with the on-screen arrows and collect three cells. Tap BRAKE to slow your drift, then dock at bottom left. Avoid asteroids.",
      ru: "Управляй экранными стрелками. Собери три батареи, нажми «ТОРМОЗ» и пристыкуйся слева внизу. Избегай астероидов.",
    },
    objectiveLabel: { en: "ENERGY CELLS", ru: "БАТАРЕИ" },
    actionLabel: { en: "BRAKE", ru: "ТОРМОЗ" },
    winText: {
      en: "Energy recovered. Docking confirmed.",
      ru: "Энергия восстановлена. Стыковка завершена.",
    },
    goal: {
      en: "Collect three cells. Brake and dock at the station.",
      ru: "Собери три батареи. Затормози у станции.",
    },
    description: {
      en: "Pilot a drifting survey ship around a broken orbital ring. Gather three energy cells, steer clear of circling debris and slow down to dock at your station.",
      ru: "Управляй кораблём среди обломков орбитального кольца. Собери три батареи, обойди астероиды и сбрось скорость перед стыковкой.",
    },
  },
  "moss-signal": {
    instructions: {
      en: "Find three numbered beacons. Get close and press E to restore each signal, then reach the stone portal at the top.",
      ru: "Найди три пронумерованных маяка. Подойди и нажми E, чтобы включить каждый. Затем дойди до каменного портала наверху.",
    },
    touchInstructions: {
      en: "Move with the on-screen arrows. Get close to each numbered beacon and tap ACTIVATE. Restore all three, then reach the portal at the top.",
      ru: "Двигайся экранными стрелками. Подойди к каждому маяку и нажми «ВКЛЮЧИТЬ». Зажги все три и иди к порталу наверху.",
    },
    objectiveLabel: { en: "SIGNALS", ru: "СИГНАЛЫ" },
    actionLabel: { en: "ACTIVATE", ru: "ВКЛЮЧИТЬ" },
    winText: { en: "The forest is awake again.", ru: "Лес снова проснулся." },
    goal: {
      en: "Restore three signals. Reach the portal.",
      ru: "Включи три маяка. Дойди до портала.",
    },
    description: {
      en: "Find three old beacons among the overgrown ruins. Restore their signals, then reach the stone portal. A short original game, made for this collection.",
      ru: "Найди три древних маяка среди заросших руин. Восстанови сигналы и дойди до каменного портала.",
    },
  },
  tidebound: {
    instructions: {
      en: "Cross right toward the lighthouse. Wait on sandy islands while the water is bright blue. Cross when it recedes to grey. Flags save your position.",
      ru: "Двигайся вправо к маяку. Пережидай ярко-синюю волну на песчаных островках. Когда вода серая, переходи. Флажки сохраняют позицию.",
    },
    touchInstructions: {
      en: "Hold the on-screen arrows to move right. Release them to wait on sandy islands. Cross when the blue water turns grey. Flags save your position.",
      ru: "Экранными стрелками двигайся вправо. Отпусти их, чтобы ждать на островке. Переходи, когда синяя вода станет серой. Флажки сохраняют позицию.",
    },
    objectiveLabel: { en: "SAFE ISLANDS", ru: "ОСТРОВКИ" },
    actionLabel: { en: "WAIT", ru: "ЖДАТЬ" },
    winText: {
      en: "The lighthouse is within reach. Safe at last.",
      ru: "Ты у маяка. Наконец в безопасности.",
    },
    goal: {
      en: "Time three tidal crossings. Reach the lighthouse.",
      ru: "Пройди три приливных перехода. Дойди до маяка.",
    },
    description: {
      en: "Read the waves along a narrow coastal causeway. Three sandy islands offer shelter and checkpoints. Wait for low water, cross decisively, and reach the lighthouse.",
      ru: "Следи за волнами на узкой прибрежной тропе. Три песчаных островка дают укрытие и сохраняют позицию. Дождись отлива и доберись до маяка.",
    },
  },
  "ember-vault": {
    instructions: {
      en: "Find key 1 at top left, then activate seals 2 and 3 with E. Cross fire rows only when the flames are out. Reach the vault at bottom right.",
      ru: "Найди ключ 1 слева наверху, затем включи печати 2 и 3 кнопкой E. Пересекай огненные полосы, когда пламя гаснет. Сейф справа внизу.",
    },
    touchInstructions: {
      en: "Move with the on-screen arrows. Tap UNLOCK by key 1, then seals 2 and 3. Cross fire rows when flames are out. Reach the vault at bottom right.",
      ru: "Двигайся экранными стрелками. Нажми «ОТКРЫТЬ» у ключа 1, затем у печатей 2 и 3. Пересекай погасшие огненные полосы. Сейф справа внизу.",
    },
    objectiveLabel: { en: "KEY & SEALS", ru: "КЛЮЧ И ПЕЧАТИ" },
    actionLabel: { en: "UNLOCK", ru: "ОТКРЫТЬ" },
    winText: {
      en: "The seals are broken. The vault is yours.",
      ru: "Печати сняты. Хранилище открыто.",
    },
    goal: {
      en: "Find the key. Break two seals. Open the vault.",
      ru: "Найди ключ. Сними две печати. Открой хранилище.",
    },
    description: {
      en: "A brass key and two ordered seals guard the underground vault. Time your movement through pulsing fire traps. Claimed relics survive a setback.",
      ru: "Латунный ключ и две печати охраняют подземное хранилище. Выбирай момент для прохода через огненные ловушки. Найденные реликвии сохраняются.",
    },
  },
  snowbyte: {
    instructions: {
      en: "Follow flags in order: right, up, left, up, right. Ice keeps you sliding. Press E to brake at corners and avoid the dark cracks. Reach the cable car.",
      ru: "Следуй флажкам: вправо, вверх, влево, вверх, вправо. На льду ты скользишь. Нажимай E перед поворотами, обходи трещины и доберись до фуникулёра.",
    },
    touchInstructions: {
      en: "Use the on-screen arrows: right, up, left, up, right. Tap BRAKE at corners to stop sliding. Avoid dark cracks and reach the cable car.",
      ru: "Экранные стрелки: вправо, вверх, влево, вверх, вправо. Нажимай «ТОРМОЗ» на поворотах. Обходи тёмные трещины и доберись до фуникулёра.",
    },
    objectiveLabel: { en: "COURSE FLAGS", ru: "ФЛАЖКИ" },
    actionLabel: { en: "BRAKE", ru: "ТОРМОЗ" },
    winText: {
      en: "Last cable car caught. Enjoy the view.",
      ru: "Ты успел на последний фуникулёр. Наслаждайся видом.",
    },
    goal: {
      en: "Pass three flags. Reach the cable-car station.",
      ru: "Пройди три флажка. Доберись до фуникулёра.",
    },
    description: {
      en: "Slide through a winding alpine ice course. Brake before the turns, avoid crevasses and pass three checkpoint flags on the way to the final cable car.",
      ru: "Скользи по извилистой ледяной трассе. Тормози перед поворотами, обходи трещины и пройди три флажка по пути к последнему фуникулёру.",
    },
  },
};
export const worlds: World[] = worldSeeds.map((w) => ({
  ...w,
  ...gameplay[w.id],
}));
export const words = {
  en: {
    ...originalWords.en,
    concept: "Original playable mini-game",
    demo: "Original playable mini-game",
    playing: "PLAYING",
    complete: "ROUTE COMPLETE",
    worldView: "World preview",
    conceptNote:
      "One of six original playable mini-games. Insert the cartridge to play.",
    aboutCopy:
      "SAVE SLOT is an independent portfolio experiment by Beibars Ileskhan. Six imagined worlds become physical objects you can open and explore. Every cartridge contains a short, original playable game, with its own controls, goal and saved progress.",
    restartAsk: "Restart this game? Its objectives and position will reset.",
    unavailable:
      "3D is unavailable. You can still browse and play all six games.",
    controls: "Arrows / WASD to move · E for action · Esc to pause",
    touch: "Move with the pad. Use the action button below.",
    saved: "Each game keeps its own progress in this browser session.",
    six: "SIX PLAYABLE WORLDS",
    intro: "Six small worlds.\nSix playable adventures.",
  },
  ru: {
    ...originalWords.ru,
    concept: "Авторская мини-игра",
    demo: "Авторская мини-игра",
    playing: "ИГРАЕМ",
    complete: "МАРШРУТ ПРОЙДЕН",
    worldView: "Обзор мира",
    conceptNote:
      "Одна из шести авторских мини-игр. Вставь картридж, чтобы играть.",
    aboutCopy:
      "SAVE SLOT — независимый проект Бейбарса Илесхана для портфолио. Шесть вымышленных миров превращаются в предметы, которые можно открыть и исследовать. В каждом картридже — короткая авторская игра со своими правилами, целью и отдельным сохранением.",
    restartAsk: "Начать эту игру заново? Её цели и позиция сбросятся.",
    unavailable: "3D недоступно. Все шесть игр по-прежнему работают.",
    controls: "Стрелки / WASD — движение · E — действие · Esc — пауза",
    touch: "Двигайся кнопками. Для действия используй кнопку ниже.",
    saved: "Прогресс каждой игры хранится отдельно в этой сессии браузера.",
    six: "ШЕСТЬ ИГРОВЫХ МИРОВ",
    intro: "Шесть маленьких миров.\nШесть игровых приключений.",
  },
} as const;
