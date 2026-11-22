// StockLab Online — room-first multiplayer interface and six-round digital game engine.
const SUPABASE_URL = "https://euzilxlmhuxftycgaqwh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YGViDDZQTaXVpUFJDeHDtA_jfZxWy9m";

const supabaseFactory = window.supabase && window.supabase.createClient;
const db = typeof supabaseFactory === "function"
  ? supabaseFactory(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;

const byId = (id) => document.getElementById(id);
const ui = {
  welcome: byId("home"), multiplayer: byId("multiplayer"),
  enterForm: byId("enter-form"), usernameInput: byId("username-input"), enterButton: byId("enter-button"),
  guestEntry: byId("guest-entry"), workspace: byId("room-workspace"), locked: byId("workspace-locked"),
  notice: byId("app-notice"), connection: byId("connection-indicator"),
  profileSettingsForm: byId("profile-settings-form"), profileSettingsName: byId("profile-settings-name"),
  settingTheme: byId("setting-theme"), settingTextSize: byId("setting-text-size"),
  settingRoomDensity: byId("setting-room-density"), settingReduceMotion: byId("setting-reduce-motion"),
  lobbyRoomStatusPanel: byId("lobby-room-status-panel"), lobbyRoomStatusFeed: byId("lobby-room-status-feed"),
  gameRoomStatusPanel: byId("game-room-status-panel"), gameRoomStatusFeed: byId("game-room-status-feed"),
  playerPill: byId("player-pill"), playerAvatar: byId("player-avatar"), playerName: byId("player-name-label"),
  roomHub: byId("room-hub"), showCreatePanel: byId("show-create-panel"),
  createPanel: byId("create-room-panel"), backFromCreate: byId("back-from-create"),
  joinPanel: byId("join-room-panel"),
  createForm: byId("create-room-form"), createButton: byId("create-room-button"),
  maxPlayers: byId("max-players"), createPassword: byId("create-password"),
  createBiddingSeconds: byId("create-bidding-seconds"), createTurnSeconds: byId("create-turn-seconds"),
  createIdleMinutes: byId("create-idle-minutes"),
  joinForm: byId("join-room-form"), joinInput: byId("room-code-input"),
  joinPassword: byId("join-password"), joinButton: byId("join-room-button"),
  roomList: byId("room-list"), refreshRooms: byId("refresh-rooms"),
  lobby: byId("room-lobby"), lobbyTitle: byId("lobby-title"), lobbySubtitle: byId("lobby-subtitle"),
  lobbyCode: byId("lobby-code"), lobbyCount: byId("lobby-count"), roster: byId("player-roster"),
  lobbyHint: byId("lobby-hint"), copyCode: byId("copy-code-button"), readyButton: byId("ready-button"),
  startButton: byId("start-game-button"), leaveButton: byId("leave-room-button"),
  roomSettingsForm: byId("room-settings-form"), lobbyBiddingSeconds: byId("lobby-bidding-seconds"),
  lobbyTurnSeconds: byId("lobby-turn-seconds"), lobbyIdleMinutes: byId("lobby-idle-minutes"),
  saveRoomSettings: byId("save-room-settings"),
  gameTable: byId("game-table"), gameSubtitle: byId("game-subtitle"), gameRound: byId("game-round"),
  gamePhase: byId("game-phase"), gamePhaseDescription: byId("game-phase-description"),
  phaseActivePlayer: byId("phase-active-player"),
  phaseTimer: byId("phase-timer"), leaveGameButton: byId("leave-game-button"),
  gamePlayerSeats: byId("game-player-seats"),
  marketGrid: byId("market-grid"),
  activityFeed: byId("activity-feed"),
  gamePlayers: byId("game-players"), gamePlayerCount: byId("game-player-count"),
  ownCoins: byId("own-coins"), ownShares: byId("own-shares"), ownDebt: byId("own-debt"),
  privatePeek: byId("private-peek"), economyEffectSummary: byId("economy-effect-summary"),
  phaseControls: byId("phase-controls"), actionMarketSection: byId("action-market-section"),
  actionMarket: byId("action-market"), actionMarketCount: byId("action-market-count"),
  economySection: byId("economy-section"), economyReveal: byId("economy-reveal"),
  finalSection: byId("final-section"), finalScores: byId("final-scores"), gameNote: byId("game-note")
};

byId("game-rules-open")?.addEventListener("click", () => {
  const dialog = byId("game-rules-dialog");
  if (dialog && typeof dialog.showModal === "function") dialog.showModal();
});
byId("game-rules-close")?.addEventListener("click", () => {
  const dialog = byId("game-rules-dialog");
  if (dialog && typeof dialog.close === "function") dialog.close();
});
byId("game-log-button")?.addEventListener("click", () => {
  const details = byId("game-log-details");
  if (!details) return;
  details.open = !details.open;
  if (details.open) details.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

const sessionState = {
  user: null, username: "", roomId: null, roomCode: "", roomMeta: null,
  members: [], gameView: null, channel: null, gameLoadSeq: 0,
  phaseTimerHandle: null, autoTimeoutPending: false,
  selectedActionCardId: null,
  lastSpotlightEventId: null,
  lastPeekSignature: null,
  economyReviewAcknowledgedEventId: null
};

const SECTORS = [
  { id: "finance", name: "Keuangan" },
  { id: "consumer", name: "Konsumer" },
  { id: "agriculture", name: "Agrikultur" },
  { id: "mining", name: "Tambang" }
];
const SHARE_KEYS = [...SECTORS.map((sector) => sector.id), "mutual_fund"];

function setConnection(label, online = false) {
  const text = ui.connection.querySelector("span");
  if (text) text.textContent = label;
  ui.connection.classList.toggle("connected", online);
}

function showNotice(message, kind = "info", linkText = "", linkHref = "") {
  ui.notice.replaceChildren();
  ui.notice.className = "app-notice " + kind;
  ui.notice.append(document.createTextNode(message));
  if (linkText && linkHref) {
    const link = document.createElement("a");
    link.href = linkHref;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = linkText;
    ui.notice.append(document.createTextNode(" "), link);
  }
  ui.notice.hidden = !message;
}

function clearNotice() {
  showNotice("");
}

function errorMessage(error) {
  const message = error && (error.message || error.error_description || error.details)
    ? String(error.message || error.error_description || error.details)
    : "Terjadi kesalahan. Coba lagi.";
  if (/It is not your turn/i.test(message)) {
    return "Giliran sudah berpindah atau meja belum tersinkron. Tunggu sampai namamu disorot sebelum memilih kartu.";
  }
  if (/Akuisisi gagal/i.test(message)) {
    return message.replace("Akuisisi gagal.", "Akuisisi belum bisa dilakukan.");
  }
  return message;
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText || "Memproses…";
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function cleanPlayerName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function makeSelect(options, selected) {
  const select = document.createElement("select");
  select.className = "game-input";
  for (const option of options) addOption(select, option.value, option.label);
  if (selected !== undefined) select.value = String(selected);
  return select;
}

function makeField(labelText, control) {
  const wrapper = document.createElement("label");
  wrapper.className = "game-field";
  wrapper.append(makeElement("span", "", labelText), control);
  return wrapper;
}

async function ensureGuestSession() {
  if (!db) throw new Error("Library Supabase belum berhasil dimuat. Muat ulang halaman.");
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session && sessionData.session.user) return sessionData.session;
  const { data, error } = await db.auth.signInAnonymously();
  if (error) {
    if (error.code === "anonymous_provider_disabled" || /anonymous.*disabled/i.test(error.message || "")) {
      throw Object.assign(new Error("Mode pemain tamu belum aktif di Supabase."), { needsAnonymousSetup: true });
    }
    throw error;
  }
  if (!data.session || !data.user) throw new Error("Supabase belum memberikan sesi pemain tamu.");
  return data.session;
}

async function savePlayerProfile(username) {
  const cleanName = cleanPlayerName(username);
  if (!sessionState.user) throw new Error("Sesi pemain belum tersedia.");
  if (cleanName.length < 2 || cleanName.length > 24) throw new Error("Username harus terdiri dari 2 sampai 24 karakter.");
  sessionState.username = cleanName;
  localStorage.setItem("stocklab_guest_username", cleanName);
  if (ui.profileSettingsName) ui.profileSettingsName.value = cleanName;
  ui.playerName.textContent = cleanName;
  ui.playerAvatar.textContent = cleanName.slice(0, 1).toUpperCase();
  ui.playerPill.hidden = false;
  return cleanName;
}

function showRoomHub() {
  document.body.classList.remove("game-in-progress");
  ui.welcome.hidden = false;
  ui.multiplayer.hidden = false;
  ui.workspace.hidden = false;
  ui.roomHub.hidden = false;
  ui.createPanel.hidden = true;
  ui.joinPanel.hidden = false;
  ui.lobby.hidden = true;
  ui.gameTable.hidden = true;
}
function openCreatePanel() {
  if (!sessionState.user) {
    showNotice("Masukkan nama pemain terlebih dahulu untuk membuat ruangan.", "warning");
    ui.usernameInput.focus();
    return;
  }
  ui.createPanel.hidden = false;
  ui.createPassword.value = "";
  ui.createPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}
function openJoinPanel(code = "") {
  ui.joinInput.value = String(code || "").toUpperCase();
  ui.joinPassword.value = "";
  ui.joinPanel.hidden = false;
  if (code) ui.joinPassword.focus();
}
function showWorkspace() {
  ui.welcome.hidden = false;
  ui.multiplayer.hidden = false;
  ui.guestEntry.hidden = true;
  ui.workspace.hidden = false;
  ui.locked.hidden = true;
  showRoomHub();
}

function showGuestSetupError() {
  showNotice(
    "Pemain tamu memerlukan Anonymous Sign-Ins yang aktif. Pastikan pengaturan itu sudah disimpan di Supabase.",
    "warning", "Buka pengaturan Auth",
    "https://supabase.com/dashboard/project/euzilxlmhuxftycgaqwh/auth/providers"
  );
}

async function enterAsGuest(event) {
  event.preventDefault();
  const username = cleanPlayerName(ui.usernameInput.value);
  if (username.length < 2 || username.length > 24) {
    showNotice("Username harus terdiri dari 2 sampai 24 karakter.", "warning");
    return;
  }
  setBusy(ui.enterButton, true, "Masuk…");
  clearNotice();
  setConnection("Menghubungkan");
  try {
    const session = await ensureGuestSession();
    sessionState.user = session.user;
    await savePlayerProfile(username);
    showWorkspace();
    setConnection("Terhubung", true);
    await refreshOpenRooms();
    await restoreRoom();
  } catch (error) {
    console.error("Guest entry failed:", error);
    if (error.needsAnonymousSetup) {
      showGuestSetupError();
      setConnection("Perlu pengaturan");
    } else {
      showNotice(errorMessage(error), "error");
      setConnection("Terputus");
    }
  } finally {
    setBusy(ui.enterButton, false);
  }
}

async function restoreExistingGuest() {
  if (!db) {
    showNotice("Library Supabase gagal dimuat. Muat ulang halaman.", "error");
    return;
  }
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (!data.session || !data.session.user) return;
    const rememberedName = cleanPlayerName(localStorage.getItem("stocklab_guest_username") || "");
    if (!rememberedName) return;
    sessionState.user = data.session.user;
    sessionState.username = rememberedName;
    ui.usernameInput.value = rememberedName;
    if (ui.profileSettingsName) ui.profileSettingsName.value = rememberedName;
    ui.playerName.textContent = rememberedName;
    ui.playerAvatar.textContent = rememberedName.slice(0, 1).toUpperCase();
    ui.playerPill.hidden = false;
    showWorkspace();
    setConnection("Terhubung", true);
    await refreshOpenRooms();
    await restoreRoom();
  } catch (error) {
    console.warn("Could not restore previous guest session:", error);
    setConnection("Perlu masuk ulang");
  }
}

async function refreshOpenRooms() {
  if (!sessionState.user) return;
  ui.roomList.replaceChildren(makeElement("div", "empty-state", "Mencari meja…"));
  const { data, error } = await db.rpc("list_open_rooms");
  if (error) {
    ui.roomList.replaceChildren(makeElement("div", "empty-state", errorMessage(error)));
    return;
  }
  const rooms = Array.isArray(data) ? data : [];
  ui.roomList.replaceChildren();
  if (!rooms.length) {
    ui.roomList.append(makeElement("div", "empty-state", "Belum ada meja terbuka. Buat meja baru atau masukkan kode undangan."));
    return;
  }
  const roomArt = ["bull", "market", "vault"];
  for (let index = 0; index < rooms.length; index += 1) {
    const room = rooms[index];
    const item = makeElement("article", "room-item");
    const cover = makeElement("div", "room-card-cover room-cover-" + roomArt[index % roomArt.length]);
    cover.append(makeElement("span", "room-card-state", room.has_password ? "PRIVATE ROOM" : "OPEN ROOM"));
    cover.append(makeElement("strong", "room-card-cover-title", "STOCKLAB"));
    const details = makeElement("div", "room-item-details");
    details.append(makeElement("strong", "", "Meja " + room.host_name));
    details.append(makeElement("span", "", room.member_count + " / " + room.max_players + " pemain"));
    details.append(makeElement("small", "room-password-state", room.has_password ? "TERKUNCI · PASSWORD" : "TERBUKA · TANPA PASSWORD"));
    const footer = makeElement("div", "room-card-footer");
    footer.append(makeElement("code", "", room.invite_code));
    const join = makeElement("button", "small-join", Number(room.member_count) >= Number(room.max_players) ? "Penuh" : "Masuk");
    join.type = "button";
    join.disabled = Number(room.member_count) >= Number(room.max_players);
    join.addEventListener("click", () => {
      if (room.has_password) {
        openJoinPanel(room.invite_code);
        showNotice("Ruangan ini memakai password. Masukkan password pada panel Quick Join.", "info");
      } else {
        joinRoom(room.invite_code, "", join);
      }
    });
    footer.append(join);
    item.append(cover, details, footer);
    ui.roomList.append(item);
  }
}

async function createRoom(event) {
  event.preventDefault();
  if (!sessionState.user) {
    showNotice("Masukkan nama pemain terlebih dahulu untuk membuat ruangan.", "warning");
    ui.usernameInput.focus();
    return;
  }
  const password = String(ui.createPassword.value || "");
  setBusy(ui.createButton, true, "Membuat room…");
  clearNotice();
  try {
    await savePlayerProfile(sessionState.username);
    const { data, error } = await db.rpc("create_room", {
      p_display_name: sessionState.username,
      p_max_players: Number(ui.maxPlayers.value),
      p_password: password === "" ? null : password,
      p_bidding_seconds: Number(ui.createBiddingSeconds.value),
      p_turn_seconds: Number(ui.createTurnSeconds.value),
      p_idle_timeout_minutes: Number(ui.createIdleMinutes.value)
    });
    if (error) throw error;
    ui.createPassword.value = "";
    await openRoom(data.room_id, data.invite_code);
    await refreshOpenRooms();
    showNotice(password ? "Room siap. Bagikan kode dan password kepada teman satu meja." :
      "Room siap tanpa password. Teman bisa langsung bergabung memakai kode room.", "success");
  } catch (error) {
    console.error("Create room failed:", error);
    showNotice(errorMessage(error), "error");
  } finally {
    setBusy(ui.createButton, false);
  }
}

async function joinRoom(code, password, button = ui.joinButton) {
  if (!sessionState.user) {
    showNotice("Masukkan nama pemain terlebih dahulu, lalu gabung menggunakan kode ruangan.", "warning");
    ui.usernameInput.focus();
    return;
  }
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
    showNotice("Kode room harus terdiri dari 6 huruf atau angka.", "warning");
    return;
  }
  const passwordValue = String(password || "");
  setBusy(button, true, "Masuk room…");
  clearNotice();
  try {
    await savePlayerProfile(sessionState.username);
    const { data, error } = await db.rpc("join_room_by_code_v2", {
      p_code: normalizedCode,
      p_password: passwordValue === "" ? null : passwordValue,
      p_display_name: sessionState.username
    });
    if (error) throw error;
    ui.joinPassword.value = "";
    await openRoom(data.room_id, normalizedCode);
    await refreshOpenRooms();
  } catch (error) {
    console.error("Join room failed:", error);
    showNotice(errorMessage(error), "error");
  } finally {
    setBusy(button, false);
  }
}

async function openRoom(roomId, inviteCode) {
  sessionState.roomId = roomId;
  sessionState.roomCode = inviteCode;
  const { data: room, error } = await db.from("rooms")
    .select("id,invite_code,host_id,max_players,status,bidding_seconds,turn_seconds,idle_timeout_minutes,last_activity_at")
    .eq("id", roomId).maybeSingle();
  if (error) throw error;
  if (!room) throw new Error("Room tidak ditemukan atau akses sudah berakhir.");
  sessionState.roomMeta = room;
  sessionState.roomCode = room.invite_code;
  ui.welcome.hidden = true;
  ui.roomHub.hidden = true;
  ui.lobby.hidden = room.status === "in_progress";
  ui.gameTable.hidden = room.status === "waiting";
  ui.lobbyCode.textContent = room.invite_code;
  ui.lobbyTitle.textContent = "Room " + room.invite_code;
  ui.lobbySubtitle.textContent = room.status === "waiting"
    ? "Bagikan kode room; password hanya dibutuhkan jika host mengaturnya."
    : room.status === "finished" ? "Permainan selesai." : "Permainan sedang berlangsung.";
  if (room.status === "waiting" || room.status === "finished") await refreshLobby();
  if (room.status === "in_progress" || room.status === "finished") await loadActiveGame();
  await refreshRoomActivity();
  subscribeToRoom();
}

async function restoreRoom() {
  if (!sessionState.user) return;
  const { data: membership, error } = await db.from("room_members")
    .select("room_id,joined_at").eq("user_id", sessionState.user.id)
    .order("joined_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !membership) return;
  const { data: room, error: roomError } = await db.from("rooms")
    .select("id,invite_code,status").eq("id", membership.room_id).maybeSingle();
  if (roomError || !room || !["waiting", "in_progress", "finished"].includes(room.status)) return;
  await openRoom(room.id, room.invite_code);
}

async function refreshLobby() {
  if (!sessionState.roomId || !sessionState.user || !sessionState.roomMeta) return;
  const { data, error } = await db.rpc("get_room_lobby", { p_room_id: sessionState.roomId });
  if (error) {
    showNotice(errorMessage(error), "error");
    return;
  }
  sessionState.members = Array.isArray(data) ? data : [];
  await refreshRoomActivity();
  const capacity = Number(sessionState.roomMeta.max_players || 5);
  ui.lobbyCount.textContent = sessionState.members.length + " / " + capacity + " pemain";
  ui.roster.replaceChildren();

  const current = sessionState.members.find((member) => member.user_id === sessionState.user.id);
  const isHost = sessionState.roomMeta.host_id === sessionState.user.id;
  const isWaiting = sessionState.roomMeta.status === "waiting";
  const allReady = sessionState.members.length >= 3 && sessionState.members.every((member) => member.is_ready);
  ui.readyButton.hidden = !isWaiting;
  ui.readyButton.disabled = !current || !isWaiting;
  ui.readyButton.textContent = current && current.is_ready ? "Batalkan siap" : "Saya siap";
  ui.readyButton.classList.toggle("is-ready", Boolean(current && current.is_ready));
  ui.startButton.hidden = !isWaiting || !isHost;
  ui.startButton.disabled = !allReady;
  const isFinished = sessionState.roomMeta.status === "finished";
  ui.leaveButton.hidden = !(isWaiting || isFinished);
  ui.leaveButton.textContent = isFinished ? "Kembali ke lobi" : "Keluar";
  ui.roomSettingsForm.hidden = !isHost || !isWaiting;
  ui.lobbyBiddingSeconds.value = String(sessionState.roomMeta.bidding_seconds || 90);
  ui.lobbyTurnSeconds.value = String(sessionState.roomMeta.turn_seconds || 45);
  ui.lobbyIdleMinutes.value = String(sessionState.roomMeta.idle_timeout_minutes || 30);

  for (let seat = 1; seat <= capacity; seat += 1) {
    const member = sessionState.members.find((entry) => Number(entry.seat_no) === seat);
    const row = makeElement("div", member ? "roster-player" : "roster-player vacant");
    const seatNo = makeElement("span", "seat-number", String(seat).padStart(2, "0"));
    const name = makeElement("strong", "", member ? member.display_name : "Kursi kosong");
    const status = makeElement("span");
    if (!member) {
      status.className = "roster-state vacant-label";
      status.textContent = "BELUM TERISI";
    } else {
      const tags = [];
      if (member.user_id === sessionState.roomMeta.host_id) tags.push("HOST");
      if (member.user_id === sessionState.user.id) tags.push("KAMU");
      tags.push(member.is_ready ? "SIAP" : "BELUM SIAP");
      status.className = "roster-state " + (member.is_ready ? "ready" : "pending");
      status.textContent = tags.join(" · ");
    }
    row.append(seatNo, name, status);
    ui.roster.append(row);
  }

  if (!isWaiting) ui.lobbyHint.textContent = "Permainan sudah dimulai.";
  else if (sessionState.members.length < 3) ui.lobbyHint.textContent = "Butuh minimal tiga pemain untuk memulai.";
  else if (!allReady) ui.lobbyHint.textContent = "Semua pemain yang bergabung harus menandai siap sebelum host memulai.";
  else ui.lobbyHint.textContent = isHost ? "Semua pemain siap. Host dapat memulai permainan." : "Semua pemain siap. Menunggu host memulai permainan.";
}

async function refreshRoomActivity() {
  if (!sessionState.roomId || !sessionState.user) return;
  const { data, error } = await db.from("room_status_events")
    .select("id,actor_name,event_type,created_at")
    .eq("room_id", sessionState.roomId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) {
    console.warn("Could not load room status events:", error);
    return;
  }
  const events = Array.isArray(data) ? data : [];
  const renderFeed = (target) => {
    if (!target) return;
    target.replaceChildren();
    if (!events.length) {
      target.append(makeElement("p", "room-status-empty", "Belum ada pemain yang keluar."));
      return;
    }
    for (const event of events) {
      const row = makeElement("div", "room-status-event");
      const icon = makeElement("span", "room-status-icon", "↗");
      const copy = makeElement("div", "room-status-copy");
      copy.append(makeElement("strong", "", event.actor_name + " keluar dari room"));
      const time = event.created_at
        ? new Date(event.created_at).toLocaleString("id-ID", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
          })
        : "";
      copy.append(makeElement("small", "", time));
      row.append(icon, copy);
      target.append(row);
    }
  };
  renderFeed(ui.lobbyRoomStatusFeed);
  renderFeed(ui.gameRoomStatusFeed);
  if (ui.lobbyRoomStatusPanel) ui.lobbyRoomStatusPanel.hidden = false;
  if (ui.gameRoomStatusPanel) ui.gameRoomStatusPanel.hidden = false;
}

async function syncRoomState() {
  if (!sessionState.roomId) return;
  const { data: room, error } = await db.from("rooms")
    .select("id,invite_code,host_id,max_players,status,bidding_seconds,turn_seconds,idle_timeout_minutes,last_activity_at")
    .eq("id", sessionState.roomId).maybeSingle();
  if (error || !room) return;
  sessionState.roomMeta = room;
  ui.lobbySubtitle.textContent = room.status === "waiting"
    ? "Bagikan kode room; password hanya dibutuhkan jika host mengaturnya."
    : room.status === "finished" ? "Permainan selesai." : "Permainan sedang berlangsung.";
  ui.roomHub.hidden = true;
  ui.lobby.hidden = room.status === "in_progress";
  ui.gameTable.hidden = room.status === "waiting";
  if (room.status === "waiting" || room.status === "finished") await refreshLobby();
  if (room.status === "in_progress" || room.status === "finished") await loadActiveGame();
  await refreshOpenRooms();
}

async function startGame() {
  if (!sessionState.roomId || !sessionState.user) return;
  setBusy(ui.startButton, true, "Memulai…");
  clearNotice();
  try {
    const { error } = await db.rpc("start_game", { p_room_id: sessionState.roomId });
    if (error) throw error;
    await syncRoomState();
  } catch (error) {
    console.error("Start game failed:", error);
    showNotice(errorMessage(error), "error");
  } finally {
    setBusy(ui.startButton, false);
  }
}

async function loadActiveGame() {
  if (!sessionState.roomId || !sessionState.user) return;
  const loadId = ++sessionState.gameLoadSeq;
  const { data, error } = await db.rpc("get_game_view", { p_room_id: sessionState.roomId });
  if (loadId !== sessionState.gameLoadSeq) return;
  if (error) {
    showNotice(errorMessage(error), "error");
    return;
  }
  if (!data) return;
  sessionState.gameView = data;
  renderGame(data);
}

function renderMarket(market, state) {
  if (!ui.marketGrid) return;
  ui.marketGrid.replaceChildren();
  const pair = Array.isArray(state && state.mutual_fund_pair) && state.mutual_fund_pair.length === 2
    ? state.mutual_fund_pair : ["consumer", "agriculture"];
  const linked = pair.map((id) => SECTORS.find((sector) => sector.id === id)).filter(Boolean);
  const unlinked = SECTORS.filter((sector) => !pair.includes(sector.id));
  const events = Array.isArray(state && state.events) ? state.events : [];
  const latestEconomy = Array.isArray(state && state.last_economy) ? state.last_economy : [];

  const trendFor = (sectorId) => {
    for (const event of events) {
      const payload = event.payload || {};
      const changes = Array.isArray(payload.price_changes)
        ? payload.price_changes
        : event.event_type === "economy_revealed" && Array.isArray(payload.effects)
          ? payload.effects : [];
      const found = changes.find((item) => item.sector === sectorId &&
        Number.isFinite(Number(item.old_price)) && Number.isFinite(Number(item.new_price)));
      if (found) return Number(found.new_price) - Number(found.old_price);
    }
    const historic = Array.isArray(state && state.last_economy_effects) ? state.last_economy_effects : [];
    const found = historic.find((item) => item.sector === sectorId &&
      Number.isFinite(Number(item.old_price)) && Number.isFinite(Number(item.new_price)));
    return found ? Number(found.new_price) - Number(found.old_price) : 0;
  };

  const makeSectorCard = (sector, isLinked) => {
    const cell = makeElement("article", "market-unit-card market-sector-card" +
      (isLinked ? " is-mutual-fund-source" : ""));
    cell.dataset.sector = sector.id;
    const heading = makeElement("div", "market-unit-heading");
    heading.append(makeElement("strong", "", sector.name));
    const remaining = economyCardsRemaining(state, sector.id);
    heading.append(makeElement("small", "deck-count" + (remaining === 0 ? " is-empty" : ""),
      remaining > 0 ? "SISA " + remaining + " KARTU" : "HABIS"));
    const art = makeElement("div", "market-unit-art");
    appendCardImage(art, sectorBoardAsset(sector.id),
      "Papan sektor " + sector.name, "market-board-image");
    const price = makeElement("div", "market-unit-price");
    const delta = trendFor(sector.id);
    const arrow = makeElement("span", "market-trend " +
      (delta > 0 ? "trend-up" : delta < 0 ? "trend-down" : "trend-flat"),
      delta > 0 ? "▲" : delta < 0 ? "▼" : "•");
    arrow.setAttribute("aria-label", delta > 0 ? "Harga naik" : delta < 0 ? "Harga turun" : "Belum berubah");
    price.append(arrow, makeElement("strong", "", String(Number(market[sector.id] || 5))));
    const footer = makeElement("small", "market-unit-caption",
      isLinked ? "Penentu harga Reksa Dana" : "Harga per saham");
    const economySlot = makeElement("div", "sector-economy-slot");
    const lastCard = latestEconomy.find(item => item.stack_sector === sector.id);
    if (lastCard && lastCard.card) {
      appendCardImage(economySlot, economyCardAsset(lastCard.card),
        "Kartu ekonomi terakhir sektor " + sector.name, "sector-economy-image");
      economySlot.append(makeElement("small", "sector-economy-caption",
        "TERAKHIR · " + (lastCard.card.name || "Kartu ekonomi")));
    } else {
      appendCardImage(economySlot, "./assets/cards/components/stocklab-back-dark.webp",
        "Kartu ekonomi tertutup sektor " + sector.name, "sector-economy-image is-back");
      economySlot.append(makeElement("small", "sector-economy-caption", "KARTU EKONOMI"));
    }
    cell.append(heading, art, price, footer, economySlot);
    return cell;
  };

  const mutualFundPrice = Math.floor((
    Number(market[linked[0] && linked[0].id] || 0) +
    Number(market[linked[1] && linked[1].id] || 0)
  ) / 2);
  const mutualFund = makeElement("article", "market-unit-card mutual-fund-unit-card");
  const mfHeading = makeElement("div", "market-unit-heading");
  mfHeading.append(makeElement("strong", "", "REKSA DANA"));
  mfHeading.append(makeElement("small", "deck-count mf-formula-tag", "2 SAHAM"));
  const mfArt = makeElement("div", "mf-center-art");
  appendCardImage(mfArt, "./assets/cards/boards/papan-reksa-dana.webp",
    "Papan Reksa Dana StockLab", "mutual-fund-center-image");
  const mfValue = makeElement("div", "market-unit-price mf-market-price");
  mfValue.append(makeElement("span", "market-trend trend-flat", "•"));
  mfValue.append(makeElement("strong", "mf-unit-value", String(mutualFundPrice)));
  const mfCaption = makeElement("small", "market-unit-caption", "Harga per unit Reksa Dana");
  const mfFormula = makeElement("div", "mf-unit-caption mf-formula-strip");
  mfFormula.append(makeElement("strong", "", "SUMBER HARGA"));
  mfFormula.append(makeElement("span", "",
    sectorName(pair[0]) + " " + Number(market[pair[0]] || 0) + " + " +
    sectorName(pair[1]) + " " + Number(market[pair[1]] || 0) + " ÷ 2"));
  mutualFund.append(mfHeading, mfArt, mfValue, mfCaption, mfFormula);

  // The two stocks linked to Mutual Fund sit immediately beside it;
  // the remaining two sectors form the outside edges of the same market block.
  const order = [
    { sector: unlinked[0], linked: false },
    { sector: linked[0], linked: true },
    { mutualFund: true },
    { sector: linked[1], linked: true },
    { sector: unlinked[1], linked: false }
  ];
  for (const item of order) {
    ui.marketGrid.append(item.mutualFund ? mutualFund : makeSectorCard(item.sector, item.linked));
  }
}


function makeSeatHoldings(player) {
  const root = makeElement("div", "seat-holdings");
  const shares = player && player.shares || {};
  let total = 0;
  for (const key of SHARE_KEYS) {
    const count = Math.max(0, Number(shares[key] || 0));
    if (!count) continue;
    total += count;
    const item = makeElement("div", "seat-holding seat-holding-" + key);
    const art = makeElement("div", "seat-holding-art");
    appendCardImage(art, shareCardAsset(key), sectorName(key), "seat-holding-image");
    art.append(makeElement("span", "seat-holding-count", count));
    const shortLabel = ({
      finance: "KEU", consumer: "KONS", agriculture: "AGRI",
      mining: "TAMB", mutual_fund: "RD"
    })[key] || sectorName(key).toUpperCase();
    item.append(art, makeElement("small", "seat-holding-label", shortLabel + " " + count));
    root.append(item);
  }
  if (!total) root.append(makeElement("small", "seat-holdings-empty", "Belum memiliki aset"));
  return root;
}

function renderGameSeats(players, view, privateState) {
  ui.gamePlayerSeats.replaceChildren();
  const drawingOrderCards = Boolean(view && view.state && view.state.phase_status === "awaiting_order_picks");
  const byOrder = [...players].sort((a, b) => drawingOrderCards
    ? Number(a.seat_no || 0) - Number(b.seat_no || 0)
    : Number(a.order_no) - Number(b.order_no));
  const ownIndex = Math.max(0, byOrder.findIndex((player) => player.user_id === sessionState.user.id));
  const rotated = byOrder.slice(ownIndex).concat(byOrder.slice(0, ownIndex));
  const positions = {
    2: ["bottom", "top"],
    3: ["bottom", "top-left", "top-right"],
    4: ["bottom", "left", "top", "right"],
    5: ["bottom", "left", "top-left", "top-right", "right"]
  }[rotated.length] || ["bottom", "left", "top", "right", "top-left"];
  for (let index = 0; index < rotated.length; index += 1) {
    const player = rotated[index];
    const isOwn = player.user_id === sessionState.user.id;
    const isTurn = player.user_id === view.active_user_id;
    const seat = makeElement("article", "game-player-seat seat-" + positions[index] +
      (isOwn ? " is-you" : "") + (isTurn ? " is-active-turn" : ""));
    const avatar = makeElement("span", "seat-avatar", String(player.display_name || "P").slice(0, 1).toUpperCase());
    const identity = makeElement("div", "seat-identity");
    const nameRow = makeElement("div", "seat-name-order");
    const orderMarker = makeElement("span", "seat-order-card" + (isTurn ? " is-active" : ""));
    orderMarker.append(
      makeElement("small", "", "URUTAN"),
      makeElement("strong", "", Number(player.order_card_number || player.order_no || 0) > 0
        ? String(player.order_card_number || player.order_no) : "—")
    );
    nameRow.append(orderMarker, makeElement("strong", "seat-player-name", player.display_name || "Pemain"));
    identity.append(nameRow);
    const tags = [];
    if (player.is_host || player.user_id === sessionState.roomMeta?.host_id) tags.push("HOST");
    if (isOwn) tags.push("KAMU");
    if (isTurn) tags.push("GILIRAN");
    if (tags.length) identity.append(makeElement("small", "seat-tags", tags.join(" · ")));
    const publicPeeks = Array.isArray(view.state && view.state.info_bursa_public)
      ? view.state.info_bursa_public : [];
    const infoPeek = publicPeeks.find(item => item.user_id === player.user_id &&
      Number(item.round) === Number(view.current_round));
    if (infoPeek && Array.isArray(infoPeek.sectors)) {
      const sectorLabels = infoPeek.sectors.map(sectorName).join(" · ");
      identity.append(makeElement("small", "seat-info-bursa", "INFO BURSA · " + sectorLabels));
    }
    identity.append(makeSeatHoldings(player));
    if (isOwn) identity.append(makeElement("small", "seat-own-coins",
      Number(privateState.coins || 0) + " koin"));
    seat.append(avatar, identity);
    ui.gamePlayerSeats.append(seat);
  }
}

function renderPortfolio(players, drawingOrderCards = false) {
  ui.gamePlayers.replaceChildren();
  const labels = {
    finance: "Keuangan", consumer: "Konsumer", agriculture: "Agrikultur",
    mining: "Tambang", mutual_fund: "Reksa Dana"
  };
  for (const player of players) {
    const isTurn = player.user_id === (sessionState.gameView && sessionState.gameView.active_user_id);
    const row = makeElement("tr", isTurn ? "portfolio-active-player" : "");
    const name = makeElement("td", "", player.display_name + (player.user_id === sessionState.user.id ? " (kamu)" : ""));
    const order = drawingOrderCards
      ? " · Kartu urutan " + (player.order_card_number || "?")
      : " · Giliran " + (player.order_no || "?") +
        (player.order_card_number == null ? "" : " · Kartu " + player.order_card_number);
    name.textContent += order;
    row.append(name);
    for (const key of SHARE_KEYS) row.append(makeElement("td", "", Number(player.shares && player.shares[key] || 0)));
    ui.gamePlayers.append(row);
  }
}


function shareCardAsset(sectorId) {
  if (sectorId === "mutual_fund") return CARD_ASSET_ROOT + "/boards/papan-reksa-dana.webp";
  return sectorBoardAsset(sectorId);
}


function describeActivityEvent(event, players) {
  const p = event.payload || {};
  const playerName = (id) => {
    const player = (players || []).find((item) => item.user_id === id);
    return player ? player.display_name : "pemain";
  };
  const actor = event.actor_name || (event.actor_id ? playerName(event.actor_id) : "Bank");
  const priceSummary = (changes) => (Array.isArray(changes) ? changes : [])
    .filter((item) => item && item.sector && item.old_price != null && item.new_price != null)
    .map((item) => sectorName(item.sector) + " " + item.old_price + " → " + item.new_price)
    .join(" · ");

  if (event.event_type === "order_card_revealed") {
    return (event.actor_name || "Pemain") + " membuka kartu urutan nomor " + (p.order_no || "—") + ".";
  }
  if (event.event_type === "action_card_used") {
    if (p.mode === "keep") {
      if (p.action === "trading-fee") {
        return actor + " menyimpan kartu Trading Fee " + sectorName(p.sector) +
          " dan membayar pajak " + Number(p.fee_paid || 0) + " koin atas " +
          Number(p.fee_units || 0) + " unit sektor tersebut.";
      }
      return actor + " menyimpan " + (p.card_title || "kartu aksi") +
        (p.sector === "mutual_fund" ? " sebagai Reksa Dana." : " sebagai saham " + sectorName(p.sector) + ".");
    }
    if (p.action === "quickbuy") {
      const taken = (Array.isArray(p.quickbuy_cards) ? p.quickbuy_cards : [])
        .map((item) => sectorName(item.sector)).join(" dan ");
      return actor + " mengaktifkan Quickbuy dan mengambil saham " +
        (taken || "dari dua kartu pilihan") +
        (p.skipped_next_turn ? ". Giliran berikutnya otomatis dilewati." : ".");
    }
    if (p.action === "trading-fee") {
      const sale = Number(p.sell_quantity || 0) + " " + sectorName(p.sell_sector);
      const basis = p.sector === "mutual_fund" ? "unit Reksa Dana" : "saham sektor";
      return actor + " membayar " + Number(p.fee_paid || 0) +
        " koin Trading Fee karena memiliki " + Number(p.fee_units || 0) +
        " " + basis + ", lalu menjual " + sale + " dan menerima " +
        Number(p.sale_proceeds || 0) + " koin.";
    }
    if (p.action === "acquisition") {
      return actor + " menggunakan Akuisisi dan mengambil 1 saham " +
        sectorName(p.target_sector || p.sector) + " dari " +
        (p.target_display_name || playerName(p.target_user_id)) + ".";
    }
    if (p.action === "rumor") {
      const changes = priceSummary(p.price_changes);
      return actor + " mengaktifkan Rumor" +
        (changes ? ": " + changes : ". Harga tidak berubah.");
    }
    if (p.action === "info-bursa") {
      const choice = p.choice || {};
      const sectors = [choice.sector_a,choice.sector_b].filter(Boolean).map(sectorName);
      return actor + " menggunakan Info Bursa untuk mengintip dua sektor" +
        (sectors.length ? ": " + sectors.join(" dan ") : "") +
        ". Isi kartu hanya terlihat oleh pemain tersebut; bonus 2 koin diterima.";
    }
    return actor + " mengaktifkan " + (p.card_title || "kartu aksi") + ".";
  }
  if (event.event_type === "sell_turn") {
    const qty = Number(p.quantity || 0);
    if (!qty) return actor + " melewati kesempatan menjual saham.";
    return actor + " menjual " + qty + " " + sectorName(p.sector) +
      " pada harga " + Number(p.unit_price || 0) + " dan menerima " +
      Number(p.coins_earned || 0) + " koin.";
  }
  if (event.event_type === "debt_offer_decided") {
    return actor + (p.accepted
      ? " menerima Kartu Utang dan mendapat 10 koin; 13 koin akan dikurangi pada skor akhir."
      : " menolak Kartu Utang; saldo dan aset tidak berubah.");
  }
  if (event.event_type === "debt_offer_timeout") {
    return "Waktu penawaran utang habis. Pemain yang belum menjawab dianggap menolak.";
  }
  if (event.event_type === "debt_taken") {
    return actor + " membalik 1 saham " + sectorName(p.flipped_sector) + " dan menerima 10 koin pinjaman.";
  }
  if (event.event_type === "economy_revealed") {
    const cards = (Array.isArray(p.cards) ? p.cards : [])
      .map((item) => {
        const cardName = item.card && item.card.name ? item.card.name : item.name;
        const sector = item.stack_sector || (item.card && item.card.stack_sector);
        return cardName ? sectorName(sector) + ": " + cardName : "";
      })
      .filter(Boolean).join(" · ");
    const moves = priceSummary(p.effects);
    const messages = (Array.isArray(p.effects) ? p.effects : [])
      .map((effect) => effect && effect.message).filter(Boolean).join(" ");
    return "Ronde " + Number(p.round || 0) + " · kartu ekonomi — " +
      (cards || "empat tumpukan diperbarui") +
      (moves ? " · Harga: " + moves : "") +
      (messages ? " · " + messages : "");
  }
  if (event.event_type === "action_timeout") {
    if (p.auto_kept_card) return actor + " kehabisan waktu; sistem otomatis menyimpan " + p.auto_kept_card + ".";
    return "Waktu fase aksi habis; sistem melanjutkan permainan.";
  }
  if (event.event_type === "sell_timeout") return "Waktu menjual habis; sistem melewati giliran " + actor + ".";
  if (event.event_type === "bids_revealed" || event.event_type === "bids_auto_resolved") {
    const results = Array.isArray(p.results) ? p.results : [];
    const ranking = results.map((item) =>
      (item.display_name || playerName(item.user_id)) + " (" + Number(item.bid_amount || 0) + " koin)"
    ).join(" · ");
    return "Urutan bermain ditentukan" + (ranking ? ": " + ranking : ".") + ".";
  }
  if (event.event_type === "game_started") return "Permainan dimulai. Semua pemain bersiap untuk ronde pertama.";
  if (event.event_type === "game_finished") return "Permainan selesai. Pemenang: " + (p.winner_name || playerName(p.winner_user_id)) + ".";
  return actor + " melakukan aktivitas permainan.";
}

function renderActivityFeed(events, players) {
  if (!ui.activityFeed) return;
  ui.activityFeed.replaceChildren();
  const list = Array.isArray(events) ? events.slice(0, 4) : [];
  if (!list.length) {
    ui.activityFeed.append(makeElement("p", "activity-empty", "Belum ada aktivitas. Transaksi akan muncul di sini."));
    return;
  }
  for (const event of list) {
    const item = makeElement("article", "activity-item activity-" + String(event.event_type || "event").replace(/[^a-z0-9_-]/gi, ""));
    const time = event.created_at
      ? new Date(event.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      : "";
    item.append(makeElement("time", "activity-time", time));
    item.append(makeElement("p", "activity-message", describeActivityEvent(event, players)));
    ui.activityFeed.append(item);
  }
}

function renderGameEventSpotlight(events, players) {
  const root = byId("game-event-spotlight");
  if (!root) return;
  root.replaceChildren();
  const event = Array.isArray(events) && events.length ? events[0] : null;
  if (!event) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const payload = event.payload || {};
  const visual = makeElement("div", "spotlight-visual");
  if (event.event_type === "action_card_used") {
    appendCardImage(visual, actionCardAsset({
      sector: payload.sector || "finance",
      action: payload.action || "info-bursa"
    }), payload.card_title || "Kartu aksi StockLab", "spotlight-card-image");
  } else if (event.event_type === "economy_revealed") {
    appendCardImage(visual, economyCardAsset(
      (payload.cards && payload.cards[0] && payload.cards[0].card) || {}
    ), "Kartu ekonomi yang baru dibuka", "spotlight-card-image");
  } else {
    appendCardImage(visual, "./assets/cards/components/stocklab-back-red.webp", "Aktivitas meja StockLab", "spotlight-card-image");
  }
  const copy = makeElement("div", "spotlight-copy");
  const actorName = event.actor_name || "Aktivitas meja";
  copy.append(makeElement("small", "spotlight-eyebrow", actorName.toUpperCase()));
  copy.append(makeElement("strong", "spotlight-heading",
    event.event_type === "action_card_used" ? (payload.card_title || "Kartu aksi") :
      event.event_type === "economy_revealed" ? "Pasar ekonomi diperbarui" : "Aktivitas terbaru"));
  copy.append(makeElement("p", "spotlight-message", describeActivityEvent(event, players)));
  const time = event.created_at
    ? new Date(event.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "";
  copy.append(makeElement("time", "spotlight-time", time));
  root.append(visual, copy);
  root.classList.toggle("is-new", sessionState.lastSpotlightEventId !== event.id);
  sessionState.lastSpotlightEventId = event.id;
}



function renderPrivatePeekDialog(peek, round, triggerId) {
  const existing = document.querySelector(".private-peek-modal-layer");
  if (!Array.isArray(peek) || peek.length === 0) {
    if (existing) existing.remove();
    sessionState.lastPeekSignature = null;
    return;
  }
  const signature = String(round || "") + "|" + String(triggerId || "") + "|" +
    peek.map((item) => String(item.sector || "") + ":" +
      String(item.card && (item.card.id || item.card.name) || "")).join("|");
  if (signature === sessionState.lastPeekSignature && existing) return;
  if (existing) existing.remove();
  if (signature === sessionState.lastPeekSignature) return;
  sessionState.lastPeekSignature = signature;

  const layer = makeElement("div", "private-peek-modal-layer");
  const dialog = makeElement("section", "private-peek-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Hasil intipan Info Bursa");
  const header = makeElement("div", "private-peek-dialog-header");
  const copy = makeElement("div", "private-peek-dialog-copy");
  copy.append(makeElement("small", "", "INFO BURSA · RONDE " + Number(round || 1)));
  copy.append(makeElement("strong", "", "Hasil intipanmu"));
  copy.append(makeElement("p", "", "Dua kartu teratas dari sektor pilihanmu. Informasi ini hanya terlihat olehmu."));
  const close = makeElement("button", "private-peek-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Tutup hasil intipan");
  close.addEventListener("click", () => layer.remove());
  header.append(copy, close);
  dialog.append(header);
  const grid = makeElement("div", "private-peek-result-grid");
  for (const item of peek.slice(0, 2)) {
    const card = item.card || {};
    const tile = makeElement("article", "private-peek-result-card");
    appendCardImage(tile, economyCardAsset(card), "Kartu ekonomi " + (card.name || "teratas"), "private-peek-result-image");
    const details = makeElement("div", "private-peek-result-copy");
    details.append(makeElement("small", "", sectorName(item.sector)));
    details.append(makeElement("strong", "", card.name || "Kartu ekonomi"));
    details.append(makeElement("p", "", card.body || "Deskripsi kartu tidak tersedia."));
    tile.append(details);
    grid.append(tile);
  }
  dialog.append(grid);
  const footer = makeElement("div", "private-peek-dialog-footer");
  footer.append(makeElement("small", "", "Hasil ini bersifat pribadi dan tidak dibagikan ke pemain lain."));
  const done = makeElement("button", "button primary", "Mengerti");
  done.type = "button";
  done.addEventListener("click", () => layer.remove());
  footer.append(done);
  dialog.append(footer);
  layer.append(dialog);
  layer.addEventListener("click", (event) => {
    if (event.target === layer) layer.remove();
  });
  layer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") layer.remove();
  });
  document.body.append(layer);
}


function renderPhaseActor(view, players) {
  if (!ui.phaseActivePlayer) return;
  const hostId = sessionState.roomMeta && sessionState.roomMeta.host_id;
  const active = players.find((player) => player.user_id === view.active_user_id);
  const host = players.find((player) => player.user_id === hostId);
  if (view.phase === "bidding" && view.state && view.state.phase_status === "awaiting_debt_decisions") {
    ui.phaseActivePlayer.textContent = "Semua pemain menjawab penawaran utang";
  } else if (view.phase === "bidding" && view.state && view.state.phase_status === "awaiting_order_picks") {
    ui.phaseActivePlayer.textContent = "Semua pemain memilih kartu urutan";
  } else if (view.phase === "bidding") {
    ui.phaseActivePlayer.textContent = "Semua pemain mengajukan penawaran";
  } else if (view.phase === "economy") {
    ui.phaseActivePlayer.textContent = (host ? host.display_name : "Host") + " · buka kartu ekonomi";
  } else if (view.phase === "finished") {
    ui.phaseActivePlayer.textContent = "Permainan selesai";
  } else {
    ui.phaseActivePlayer.textContent = active
      ? active.display_name + " · URUTAN #" + Number(active.order_no || 0) +
        " · KARTU " + Number(active.order_card_number || active.order_no || 0)
      : "Menunggu giliran";
  }
}

function renderEconomyLast(state) {
  ui.economyReveal.replaceChildren();
  const items = Array.isArray(state.last_economy) ? state.last_economy : [];
  if (!items.length) {
    ui.economyReveal.append(makeElement("p", "muted-text", "Belum ada kartu ekonomi yang dibuka."));
    return;
  }
  const rawPair = Array.isArray(state.mutual_fund_pair) && state.mutual_fund_pair.length === 2
    ? state.mutual_fund_pair : ["consumer", "agriculture"];
  let linkedSectors = rawPair.map(id => SECTORS.find(sector => sector.id === id)).filter(Boolean);
  const pair = linkedSectors.length === 2 ? rawPair : ["consumer", "agriculture"];
  linkedSectors = pair.map(id => SECTORS.find(sector => sector.id === id)).filter(Boolean);
  const unlinkedSectors = SECTORS.filter(sector => !pair.includes(sector.id));
  const economyColumnBySector = new Map();
  if (unlinkedSectors[0]) economyColumnBySector.set(unlinkedSectors[0].id, 1);
  if (linkedSectors[0]) economyColumnBySector.set(linkedSectors[0].id, 2);
  if (linkedSectors[1]) economyColumnBySector.set(linkedSectors[1].id, 4);
  if (unlinkedSectors[1]) economyColumnBySector.set(unlinkedSectors[1].id, 5);

  let revealIndex = 0;
  for (const item of items) {
    const card = makeElement("article", "economy-card is-revealed");
    card.dataset.sector = item.stack_sector || "";
    const alignedColumn = economyColumnBySector.get(item.stack_sector);
    if (alignedColumn) card.style.gridColumn = String(alignedColumn);
    card.style.animationDelay = (revealIndex * 100) + "ms";
    revealIndex += 1;
    const economy = item.card || {};
    appendCardImage(card, economyCardAsset(economy), economy.name || "Kartu ekonomi StockLab", "economy-card-image");
    const title = makeElement("strong", "", economy.name || "Kartu ekonomi");
    const subtitle = makeElement("span", "", "Tumpukan " + sectorName(item.stack_sector));
    const body = makeElement("p", "", economy.body || "");
    card.append(title, subtitle, body);
    const effects = Array.isArray(item.effects) ? item.effects : [];
    for (const effect of effects) {
      const parts = [];
      const hasPriceChange = Number.isFinite(Number(effect.old_price)) &&
        Number.isFinite(Number(effect.new_price));
      if (hasPriceChange) {
        parts.push(sectorName(effect.sector) + ": " + effect.old_price + " → " + effect.new_price);
      } else if (effect.sector) {
        parts.push(sectorName(effect.sector));
      }
      if (effect.outcome && effect.outcome !== "normal") {
        parts.push(String(effect.outcome).replaceAll("_", " "));
      }
      if (effect.message) parts.push(effect.message);
      if (parts.length) card.append(makeElement("small", "economy-effect", parts.join(" · ")));
    }
    ui.economyReveal.append(card);
  }
}

function sectorName(id) {
  if (id === "mutual_fund") return "Reksa Dana";
  const item = SECTORS.find((sector) => sector.id === id);
  return item ? item.name : String(id || "—");
}

const CARD_ASSET_ROOT = "./assets/cards";
const SECTOR_ASSET_SLUGS = {
  finance: "keuangan",
  consumer: "consumer",
  agriculture: "agrikultur",
  mining: "tambang",
  mutual_fund: "reksa-dana"
};
const ACTION_ASSET_SLUGS = {
  "info-bursa": "info-bursa",
  rumor: "rumor",
  quickbuy: "quickbuy",
  "trading-fee": "trading-fee",
  acquisition: "akuisisi"
};
const ECONOMY_ASSET_SLUGS = {
  issue: "penerbitan-saham-baru",
  tax_amnesty: "tax-amnesty",
  buyback: "buyback",
  extra_fee: "extra-fee",
  merger: "merger",
  recession: "resesi",
  restructure: "restrukturisasi-ekonomi",
  stimulus: "stimulus-ekonomi",
  road_tax: "pajak-jalan",
  world_oil: "world-oil-regulation",
  dividend: "dividen",
  sideways: "sideways"
};
const MOVEMENT_ASSETS = { 1: "naik", 2: "melaju", 3: "boom", "-1": "anjlok", "-2": "terjun", "-3": "crash" };
const ECONOMY_BOARD_ASSETS = {
  finance: "back-ekonomi-keuangan",
  consumer: "back-ekonomi-consumer",
  agriculture: "back-ekonomi-agrikultur",
  mining: "back-ekonomi-tambang"
};

function sectorBoardAsset(sectorId) {
  const slug = ECONOMY_BOARD_ASSETS[sectorId];
  return slug ? CARD_ASSET_ROOT + "/boards/" + slug + ".webp" : CARD_ASSET_ROOT + "/components/stocklab-back-dark.webp";
}

function actionCardAsset(card) {
  const sector = SECTOR_ASSET_SLUGS[card && card.sector];
  const action = ACTION_ASSET_SLUGS[card && card.action];
  return sector && action ? CARD_ASSET_ROOT + "/action/" + sector + "-" + action + ".webp" : CARD_ASSET_ROOT + "/components/stocklab-back-dark.webp";
}

function economyCardAsset(card) {
  if (!card) return CARD_ASSET_ROOT + "/components/stocklab-back-dark.webp";
  const slug = card.effect === "movement"
    ? MOVEMENT_ASSETS[String(Number(card.delta))]
    : ECONOMY_ASSET_SLUGS[card.effect];
  return slug ? CARD_ASSET_ROOT + "/economy/" + slug + ".webp" : CARD_ASSET_ROOT + "/components/stocklab-back-dark.webp";
}

function appendCardImage(parent, src, alt, className) {
  const image = makeElement("img", className || "stocklab-card-image");
  image.src = src;
  image.alt = alt || "Kartu StockLab";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.replaceWith(makeElement("div", "card-image-fallback", alt || "Visual kartu belum tersedia"));
  }, { once: true });
  parent.append(image);
  return image;
}

function economyCardsRemaining(state, sectorId) {
  if (!state || state.phase === "finished") return 0;
  const stored = state.economy_remaining && sectorId ? state.economy_remaining[sectorId] : null;
  if (stored !== null && stored !== undefined && stored !== "" && Number.isFinite(Number(stored))) {
    return Math.max(0, Number(stored));
  }
  // Seven cards per sector: before the first economy reveal, all seven remain.
  return Math.max(0, 8 - Number(state.round || 1));
}

function currentPlayer(view) {
  const players = view.state && Array.isArray(view.state.players) ? view.state.players : [];
  return players.find((player) => player.user_id === sessionState.user.id) || null;
}

function renderGame(view) {
  const state = view.state || {};
  const market = state.market || {};
  const players = Array.isArray(state.players) ? state.players : [];
  const own = currentPlayer(view);
  const privateState = view.my_private_state || {};
  const coins = Number(privateState.coins || 0);
  const shares = own && own.shares ? own.shares : {};
  const totalShares = SHARE_KEYS.reduce((sum, key) => sum + Number(shares[key] || 0), 0);
  const debt = Number(privateState.debt || 0);

  ui.gameTable.hidden = false;
  document.body.classList.add("game-in-progress");
  ui.gameRound.textContent = String(view.current_round || 1).padStart(2, "0");
  document.body.dataset.gamePhase = view.phase || "";
  document.body.dataset.gamePhaseStatus = state.phase_status || "";
  const roomCodeLabel = byId("game-room-code");
  if (roomCodeLabel) roomCodeLabel.textContent = sessionState.roomCode || "—";
  renderGamePhaseNav(view);
  const drawingOrderCards = view.phase === "bidding" && state.phase_status === "awaiting_order_picks";
  const offeringDebt = view.phase === "bidding" && state.phase_status === "awaiting_debt_decisions";
  const economyItems = Array.isArray(state.last_economy) ? state.last_economy : [];
  const economyRevealEvent = (view.events || []).find(event => event.event_type === "economy_revealed");
  const latestEvent = Array.isArray(view.events) ? view.events[0] : null;
  const economyReviewEventId = economyRevealEvent && economyRevealEvent.id != null
    ? String(economyRevealEvent.id)
    : String(sessionState.roomId || "room") + "-" + String(view.current_round || 1) + "-" +
      economyItems.map(item => item.card && item.card.id || item.stack_sector).join("-");
  const noDebtEconomyReview = view.phase === "bidding" &&
    state.phase_status === "awaiting_bids" &&
    economyItems.length > 0 &&
    economyRevealEvent && latestEvent && String(latestEvent.id) === String(economyRevealEvent.id);
  const economyReviewPending = economyItems.length > 0 &&
    (offeringDebt || noDebtEconomyReview) &&
    sessionState.economyReviewAcknowledgedEventId !== economyReviewEventId;
  const keepEconomyVisible = economyItems.length > 0 && (offeringDebt || economyReviewPending);
  ui.gamePhase.textContent = economyReviewPending ? "Hasil Ekonomi" :
    drawingOrderCards ? "Kartu Urutan" :
    offeringDebt ? "Penawaran Utang" : phaseName(view.phase);
  renderPhaseTimer(view);
  renderGameSeats(players, view, privateState);
  renderPhaseActor(view, players);
  ui.gameSubtitle.textContent = "Meja " + sessionState.roomCode + " · " + players.length + " pemain";
  ui.gamePhaseDescription.textContent = economyReviewPending
    ? "Kartu ekonomi ditampilkan terlebih dahulu. Setelah kamu lanjut, penawaran utang akan muncul."
    : phaseDescription(view, state);
  if (economyReviewPending && ui.phaseActivePlayer) {
    ui.phaseActivePlayer.textContent = "Semua pemain melihat hasil ekonomi";
  }
  document.body.classList.toggle("economy-reviewing", economyReviewPending);
  document.body.classList.toggle("economy-debt-stage", offeringDebt && !economyReviewPending);
  ui.ownCoins.textContent = String(coins);
  ui.ownShares.textContent = String(totalShares);
  ui.ownDebt.textContent = debt > 0 ? debt + " kartu utang · penalti akhir " + (debt * 13) : "Tanpa utang";
  ui.gamePlayerCount.textContent = players.length + " pemain";
  const portfolioCountLabel = byId("portfolio-player-count");
  if (portfolioCountLabel) portfolioCountLabel.textContent = players.length + " pemain";
  renderMarket(market, { ...state, phase: view.phase, round: view.current_round, events: view.events || [] });
  renderPortfolio(players, view.phase === "bidding" && state.phase_status === "awaiting_order_picks");
  renderActivityFeed(view.events || [], players);
  renderGameEventSpotlight(view.events || [], players);
  renderEconomyLast(state);

  if (ui.economyEffectSummary) {
    const messages = Array.isArray(state.last_economy_effects) ? state.last_economy_effects : [];
    ui.economyEffectSummary.replaceChildren();
    for (const effect of messages) {
      if (effect.message) ui.economyEffectSummary.append(makeElement("p", "muted-text", effect.message));
    }
    ui.economyEffectSummary.hidden = messages.length === 0;
  }
  const actionMarketReady = Array.isArray(state.action_market) && state.action_market.length > 0;
  const showActionMarket = view.phase === "action" ||
    (view.phase === "bidding" && actionMarketReady && !economyReviewPending && !offeringDebt);
  ui.actionMarketSection.hidden = !showActionMarket;
  if (view.phase !== "action" || view.active_user_id !== sessionState.user.id) sessionState.selectedActionCardId = null;
  // Keep the public four-card reveal visible through the debt-decision step.
  // It is removed after all decisions are complete (or after the preview when no offer exists).
  ui.economySection.hidden = !keepEconomyVisible;
  ui.finalSection.hidden = view.phase !== "finished";
  ui.actionMarketCount.textContent = Array.isArray(state.action_market) ? state.action_market.length + " kartu tersisa" : "";

  ui.privatePeek.replaceChildren();
  ui.privatePeek.hidden = true;
  const peek = Array.isArray(privateState.peek) ? privateState.peek : [];
  const lastPeekEvent = (view.events || []).find((event) =>
    event.event_type === "action_card_used" &&
    event.actor_id === sessionState.user.id &&
    event.payload && event.payload.action === "info-bursa"
  );
  renderPrivatePeekDialog(peek,view.current_round,lastPeekEvent && lastPeekEvent.id);

  if (view.phase === "finished") {
    renderFinalScores(state);
  } else {
    ui.finalSection.hidden = true;
  }
  renderPhaseControls(view, own, coins, {
    required:economyReviewPending,
    eventId:economyReviewEventId,
    hasDebtOffers:offeringDebt
  });

  // Keep the active decision panel immediately visible, not below the oversized market.
  // Economy reveal stays ahead of its acknowledgement/debt decision when it is visible.
  const marketSection = ui.marketGrid && ui.marketGrid.closest(".market-section");
  if (marketSection && ui.phaseControls && ui.phaseControls.parentElement === marketSection.parentElement) {
    if (!ui.economySection.hidden) marketSection.parentElement.insertBefore(ui.economySection, ui.phaseControls);
    marketSection.parentElement.insertBefore(ui.phaseControls, marketSection);
  }
  if (showActionMarket) renderActionMarket(view, own);
  else ui.actionMarket.replaceChildren();

  ui.gameNote.textContent = "Saldo pribadi hanya terlihat oleh pemiliknya. Deck kartu ekonomi dan aksi di versi ini merupakan adaptasi digital komunitas, bukan komposisi resmi yang telah diverifikasi.";
}

function renderGamePhaseNav(view) {
  const current = view && view.phase ? view.phase : "";
  document.querySelectorAll("[data-game-step]").forEach((step) => {
    const active = step.dataset.gameStep === current;
    step.classList.toggle("is-current", active);
    step.classList.toggle("is-complete", false);
    if (active) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
}

function phaseName(phase) {
  return ({ bidding: "Bidding", action: "Aksi", sell: "Jual", economy: "Ekonomi", finished: "Selesai" })[phase] || phase;
}

function renderPhaseTimer(view) {
  if (sessionState.phaseTimerHandle) {
    window.clearInterval(sessionState.phaseTimerHandle);
    sessionState.phaseTimerHandle = null;
  }
  sessionState.autoTimeoutPending = false;
  const drawingOrderCards = view.phase === "bidding" && view.state &&
    view.state.phase_status === "awaiting_order_picks";
  const deadline = view.phase_deadline ? new Date(view.phase_deadline).getTime() : 0;
  if (!deadline || view.phase === "finished" || drawingOrderCards) {
    ui.phaseTimer.textContent = "—";
    return;
  }
  const tick = async () => {
    const remainingMs = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    ui.phaseTimer.textContent = minutes + ":" + String(seconds).padStart(2, "0");
    ui.phaseTimer.classList.toggle("is-expired", remainingMs <= 0);
    if (remainingMs <= 0 && !sessionState.autoTimeoutPending && sessionState.roomId) {
      sessionState.autoTimeoutPending = true;
      try {
        const { error } = await db.rpc("advance_expired_turn", { p_room_id: sessionState.roomId });
        if (error) throw error;
        await loadActiveGame();
      } catch (error) {
        const message = errorMessage(error);
        if (!/deadline|expired|not a room member/i.test(message)) {
          console.warn("Auto phase advance:", error);
        }
        sessionState.autoTimeoutPending = false;
      }
    }
  };
  tick();
  sessionState.phaseTimerHandle = window.setInterval(tick, 1000);
}

function phaseDescription(view, state) {
  if (view.phase === "bidding" && state.phase_status === "awaiting_debt_decisions")
    return "Kartu aksi sudah terbuka. Pemain dapat menerima atau menolak pinjaman sebelum bidding.";
  if (view.phase === "bidding" && ["awaiting_bids","collecting_bids"].includes(state.phase_status))
    return "Kartu aksi dibuka lebih dahulu agar semua pemain bisa menyusun strategi sebelum bidding.";
  if (view.phase === "bidding" && state.phase_status === "awaiting_order_picks")
    return "Setiap pemain memilih satu kartu tertutup. Nomor urutan terbuka setelah kartu dipilih.";
  if (view.phase === "bidding") return "Ajukan penawaran koin secara tertutup untuk menentukan urutan pemain.";
  if (view.phase === "action") return state.phase_status === "drafting" ? "Ambil satu kartu secara bergiliran: simpan sebagai saham atau aktifkan efeknya." : "Fase aksi.";
  if (view.phase === "sell") return "Setiap pemain mendapat satu kesempatan untuk menjual satu jenis saham atau melewati fase jual.";
  if (view.phase === "economy") return "Host membuka satu kartu dari setiap tumpukan ekonomi.";
  return "Permainan telah selesai. Periksa skor akhir dan pemenang.";
}

function renderPhaseControls(view, own, coins, economyReview = {}) {
  ui.phaseControls.replaceChildren();
  const state = view.state || {};
  const isActive = view.active_user_id === sessionState.user.id;

  if (economyReview.required) {
    const panel = makeElement("div", "phase-panel economy-review-step-panel");
    panel.append(makeElement("small", "economy-review-kicker",
      "RONDE " + Number(view.current_round || 1) + " · HASIL PEMBUKAAN PASAR"));
    panel.append(makeElement("h4", "", "Periksa empat kartu ekonomi"));
    panel.append(makeElement("p", "muted-text",
      "Kartu dan dampaknya sudah diterapkan. Lihat semua kartu di atas; setelah lanjut, penawaran utang akan dibuka terlebih dahulu."));
    const next = makeElement("button", "button primary economy-review-continue",
      economyReview.hasDebtOffers ? "Lanjut ke penawaran utang" : "Lanjut ke bidding");
    next.type = "button";
    next.addEventListener("click", () => {
      sessionState.economyReviewAcknowledgedEventId = economyReview.eventId;
      document.body.classList.remove("economy-reviewing");
      renderGame(sessionState.gameView || view);
    });
    panel.append(next);
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "bidding" && state.phase_status === "awaiting_debt_decisions") {
    const panel = makeElement("div", "phase-panel debt-offer-panel");
    const offers = Array.isArray(state.debt_offers) ? state.debt_offers : [];
    const ownOffer = offers.find(item => item.user_id === sessionState.user.id);
    const players = Array.isArray(state.players) ? state.players : [];
    const nameFor = id => {
      const item = players.find(player => player.user_id === id);
      return item ? item.display_name : "Pemain";
    };
    const labelFor = status => ({
      pending: "MENUNGGU",
      accepted: "MENERIMA",
      declined: "MENOLAK",
      already_taken: "SUDAH PUNYA",
      unavailable: "TIDAK TERSEDIA"
    })[status] || "—";

    panel.append(makeElement("h4", "", "Penawaran Kartu Utang"));
    panel.append(makeElement("p", "muted-text",
      "Setelah kartu ekonomi dibuka, kamu boleh mengambil pinjaman dari Bank atau menolaknya. Keputusan ini tidak wajib."));
    const card = makeElement("div", "debt-offer-card");
    appendCardImage(card, "./assets/cards/components/kartu-utang.webp",
      "Kartu Utang StockLab", "debt-offer-image");
    const terms = makeElement("div", "debt-offer-terms");
    terms.append(makeElement("strong", "", "+10 KOIN"));
    terms.append(makeElement("span", "", "Pada akhir permainan, 13 koin dikurangi dari total perolehanmu."));
    terms.append(makeElement("small", "", "Tidak perlu membalik atau menyerahkan saham untuk menerima pinjaman."));
    card.append(terms);
    panel.append(card);

    if (ownOffer && ownOffer.status === "pending") {
      panel.append(makeElement("p", "debt-offer-question", "Apakah kamu menerima pinjaman 10 koin?"));
      const actions = makeElement("div", "debt-offer-actions");
      const accept = makeElement("button", "button primary", "Terima +10 koin");
      const decline = makeElement("button", "button secondary", "Tolak penawaran");
      accept.type = decline.type = "button";
      accept.addEventListener("click", async () => {
        setBusy(accept, true, "Memproses…");
        await runGameAction(() => db.rpc("respond_debt_offer", {
          p_room_id: sessionState.roomId, p_accept: true
        }), "Utang diterima: 10 koin masuk ke saldo. Potongan 13 koin berlaku pada skor akhir.");
        setBusy(accept, false);
      });
      decline.addEventListener("click", async () => {
        setBusy(decline, true, "Mencatat…");
        await runGameAction(() => db.rpc("respond_debt_offer", {
          p_room_id: sessionState.roomId, p_accept: false
        }), "Kamu menolak penawaran. Saldo dan aset tidak berubah.");
        setBusy(decline, false);
      });
      actions.append(accept, decline);
      panel.append(actions);
    } else if (ownOffer) {
      const ownMessage = ownOffer.status === "accepted"
        ? "Kamu menerima pinjaman. 10 koin sudah ditambahkan ke saldomu."
        : ownOffer.status === "declined"
          ? "Kamu menolak penawaran. Tidak ada koin atau saham yang berubah."
          : ownOffer.status === "already_taken"
            ? "Kamu sudah memiliki satu kartu utang; tidak ada pinjaman tambahan."
            : "Kartu utang tidak tersedia untukmu pada putaran ini.";
      panel.append(makeElement("p", "debt-offer-result", ownMessage));
    } else {
      panel.append(makeElement("p", "debt-offer-result",
        Number(view.my_private_state && view.my_private_state.debt || 0) > 0
          ? "Kamu sudah memiliki satu kartu utang."
          : "Tidak ada kartu utang yang tersedia untukmu."));
    }

    const responseList = makeElement("div", "debt-offer-responses");
    responseList.append(makeElement("strong", "", "Status jawaban pemain"));
    for (const offer of offers) {
      const line = makeElement("div", "debt-offer-response");
      line.append(makeElement("span", "", nameFor(offer.user_id)));
      line.append(makeElement("small", "status-" + offer.status, labelFor(offer.status)));
      responseList.append(line);
    }
    panel.append(responseList);
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "bidding" && state.phase_status === "awaiting_order_picks") {
    const panel = makeElement("div", "phase-panel order-draw-panel");
    const players = Array.isArray(state.players) ? state.players : [];
    const orderCards = Array.isArray(state.order_cards) ? state.order_cards : [];
    const me = players.find(player => player.user_id === sessionState.user.id);
    const hasPicked = Boolean(me && me.order_card_id);
    const pickedCount = orderCards.filter(card => card.picked_by).length;
    const totalPlayers = players.length;
    panel.append(makeElement("h4", "", hasPicked ? "Kartu urutanmu sudah terbuka" : "Pilih satu kartu urutan"));
    panel.append(makeElement("p", "muted-text", hasPicked
      ? "Kartu sudah dibuka. Tunggu pemain lain memilih sebelum bidding dimulai."
      : "Pilih satu kartu tertutup di meja. Nomornya akan langsung terbuka untuk semua pemain dan tidak bisa diganti."));
    const progress = makeElement("div", "order-draw-progress");
    progress.append(makeElement("strong", "", pickedCount + " / " + totalPlayers + " kartu terbuka"));
    const progressTrack = makeElement("span", "order-progress-track");
    const progressBar = makeElement("i", "order-progress-fill");
    progressBar.style.width = (totalPlayers ? (pickedCount / totalPlayers * 100) : 0) + "%";
    progressTrack.append(progressBar);
    progress.append(progressTrack);
    panel.append(progress);
    const grid = makeElement("div", "order-draw-grid");
    const pickerName = userId => {
      const player = players.find(item => item.user_id === userId);
      return player ? player.display_name : "Pemain";
    };
    for (const card of orderCards) {
      const picked = Boolean(card.picked_by);
      const choice = makeElement(picked ? "article" : "button",
        "order-draw-card" + (picked ? " is-revealed" : " is-face-down") +
        (picked && card.picked_by === sessionState.user.id ? " is-mine" : ""));
      if (!picked) {
        choice.type = "button";
        choice.disabled = hasPicked;
        appendCardImage(choice, "./assets/cards/components/stocklab-back-red.webp",
          "Kartu urutan tertutup", "order-card-back");
        choice.append(makeElement("span", "order-card-pick-label", hasPicked ? "Menunggu" : "Pilih kartu"));
        choice.addEventListener("click", async () => {
          if (hasPicked || choice.disabled) return;
          setBusy(choice, true, "Membuka…");
          await runGameAction(() => db.rpc("choose_order_card", {
            p_room_id: sessionState.roomId, p_card_id: card.id
          }), "Kartu urutan dibuka.");
          setBusy(choice, false);
        });
      } else {
        choice.append(makeElement("span", "order-card-caption", "URUTAN"));
        choice.append(makeElement("strong", "order-card-number", String(card.number)));
        choice.append(makeElement("small", "order-card-owner", pickerName(card.picked_by)));
      }
      grid.append(choice);
    }
    panel.append(grid);
    if (hasPicked) panel.append(makeElement("p", "order-draw-waiting",
      "Nomor urutanmu: " + me.order_no + " · " +
      (pickedCount < totalPlayers ? "menunggu " + (totalPlayers - pickedCount) + " pemain lagi." : "semua kartu sudah dibuka.")));
    else panel.append(makeElement("p", "order-draw-waiting",
      "Setiap pemain hanya boleh mengambil satu kartu. Kartu yang telah terbuka tidak dapat dipilih lagi."));
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "bidding") {
    const panel = makeElement("div", "phase-panel bidding-panel");
    panel.append(makeElement("h4", "", "Bidding · susun strategi"));
    panel.append(makeElement("p", "muted-text", "Kartu aksi sudah dibuka. Pelajari pasar kartu sebelum menentukan tawaran; nilai bid seluruh pemain akan diumumkan setelah semua penawaran masuk."));
    const status = view.bidding || {};
    panel.append(makeElement("p", "turn-status", status.submitted
      ? "Penawaranmu sudah terkirim. Menunggu pemain lain (" + status.submitted_count + "/" + status.player_count + ")."
      : "Penawaran diterima: " + status.submitted_count + "/" + status.player_count + "."));
    if (!status.submitted) {
      const form = makeElement("form", "inline-game-form");
      const bidInput = document.createElement("input");
      bidInput.type = "number"; bidInput.min = "1"; bidInput.max = String(coins);
      bidInput.step = "1"; bidInput.value = String(Math.min(1,coins));
      bidInput.required = true; bidInput.className = "game-input"; bidInput.disabled = coins < 1;
      form.append(makeField("Tawaran (koin)", bidInput));
      const submit = makeElement("button", "button primary", "Kirim penawaran");
      submit.type = "submit"; submit.disabled = coins < 1;
      form.append(submit);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const amount = Number(bidInput.value);
        if (!Number.isInteger(amount) || amount < 1 || amount > coins) {
          showNotice("Penawaran harus bilangan bulat dari 1 sampai saldo koinmu.", "warning");
          return;
        }
        setBusy(submit,true,"Mengirim…");
        await runGameAction(() => db.rpc("submit_bid", {
          p_room_id:sessionState.roomId,p_bid_amount:amount
        }), "Penawaran terkirim.");
        setBusy(submit,false);
      });
      panel.append(form);
    } else {
      panel.append(makeElement("p", "muted-text", "Penawaranmu: " + status.my_bid + " koin."));
    }
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "action") {
    const results = Array.isArray(state.bidding_results) ? state.bidding_results : [];
    if (results.length) {
      const reveal = makeElement("section", "bidding-results-compact");
      reveal.append(makeElement("strong", "bidding-results-title", "URUTAN RONDE"));
      const list = makeElement("div", "bidding-results-list");
      for (const result of [...results].sort((a,b) =>
        Number(a.new_order || a.order_no || 0) - Number(b.new_order || b.order_no || 0))) {
        const chip = makeElement("div", "bidding-result-chip");
        chip.append(makeElement("strong", "bidding-result-rank",
          "#" + Number(result.new_order || result.order_no || 0)));
        chip.append(makeElement("span", "bidding-result-player", result.display_name || "Pemain"));
        chip.append(makeElement("b", "bidding-result-bid",
          Number(result.bid_amount || 0) + " koin" + (result.automatic ? " · otomatis" : "")));
        chip.append(makeElement("small", "bidding-result-order",
          "Kartu #" + Number(result.previous_order_card_number || 0) + " → #" +
          Number(result.new_order || result.order_no || 0)));
        list.append(chip);
      }
      reveal.append(list);
      ui.phaseControls.append(reveal);
    }
    return;
  }

  if (view.phase === "sell") {
    const panel = makeElement("div", "phase-panel sell-card-panel");
    panel.append(makeElement("h4", "", isActive ? "Pilih kartu aset yang mau dijual" : "Menunggu penjualan"));
    panel.append(makeElement("p", "muted-text", isActive
      ? "Klik tumpukan asetmu, tentukan jumlah kartu, lalu konfirmasi penjualan."
      : "Sedang menunggu " + displayNameFor(state.players,view.active_user_id) + " menjual."));
    if (isActive) {
      const owned = SECTORS.filter((sector) => Number(own && own.shares && own.shares[sector.id] || 0) > 0)
        .map((sector) => sector.id);
      const pair = Array.isArray(state.mutual_fund_pair) ? state.mutual_fund_pair : ["consumer","agriculture"];
      const selected = { sector: owned[0] || null, quantity: 1 };
      const picker = makeElement("div", "asset-choice-grid");
      const detail = makeElement("div", "selected-asset-detail");
      const controls = makeElement("div", "quantity-stepper");
      const countLabel = makeElement("strong", "quantity-value", "1");
      const minus = makeElement("button", "stepper-button", "−");
      const plus = makeElement("button", "stepper-button", "+");
      minus.type = plus.type = "button";
      controls.append(minus, countLabel, plus);
      const preview = makeElement("p", "sale-preview");
      const confirm = makeElement("button", "button primary", "Jual kartu aset");
      confirm.type = "button";
      const draw = () => {
        picker.replaceChildren();
        for (const key of owned) {
          const count = Number(own.shares[key] || 0);
          const tile = makeElement("button", "asset-choice-card" +
            (selected.sector === key ? " is-selected" : ""));
          tile.type = "button";
          appendCardImage(tile, shareCardAsset(key), sectorName(key), "asset-choice-image");
          tile.append(makeElement("strong", "", sectorName(key)));
          tile.append(makeElement("small", "", count + " kartu"));
          tile.addEventListener("click", () => {
            selected.sector = key;
            selected.quantity = Math.max(1,Math.min(selected.quantity,Number(own.shares[key] || 1)));
            draw();
          });
          picker.append(tile);
        }
        if (!selected.sector) {
          detail.replaceChildren(makeElement("p","interaction-warning","Kamu belum memiliki kartu aset untuk dijual."));
          return;
        }
        const count = Number(own.shares[selected.sector] || 0);
        const unitPrice = selected.sector === "mutual_fund"
          ? Math.floor((Number(state.market[pair[0]] || 0) + Number(state.market[pair[1]] || 0)) / 2)
          : Number(state.market[selected.sector] || 0);
        const proceeds = unitPrice * selected.quantity;
        countLabel.textContent = String(selected.quantity);
        minus.disabled = selected.quantity <= 1;
        plus.disabled = selected.quantity >= count;
        preview.textContent = selected.quantity + " × " + unitPrice + " koin = " + proceeds + " koin diterima";
        confirm.disabled = !selected.sector || !count;
        confirm.onclick = async () => {
          setBusy(confirm, true, "Menjual…");
          await runGameAction(() => db.rpc("complete_sell_turn", {
            p_room_id:sessionState.roomId,p_sector:selected.sector,p_quantity:selected.quantity
          }), "Penjualan selesai.");
          setBusy(confirm, false);
        };
        detail.replaceChildren(
          makeElement("strong", "", sectorName(selected.sector)),
          controls,
          preview,
          confirm
        );
      };
      minus.addEventListener("click", () => { selected.quantity=Math.max(1,selected.quantity-1); draw(); });
      plus.addEventListener("click", () => {
        selected.quantity=Math.min(Number(own && own.shares && own.shares[selected.sector] || 1),selected.quantity+1);
        draw();
      });
      draw();
      const pass = makeElement("button", "button secondary", "Lewati kesempatan jual");
      pass.type = "button";
      pass.addEventListener("click", async () => {
        setBusy(pass,true,"Melewati…");
        await runGameAction(() => db.rpc("complete_sell_turn", {
          p_room_id:sessionState.roomId,p_sector:null,p_quantity:0
        }), "Giliran jual dilewati.");
        setBusy(pass,false);
      });
      panel.append(picker, detail, pass);
    }
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "economy") {
    const panel = makeElement("div","phase-panel economy-card-panel");
    const isHost = sessionState.roomMeta && sessionState.roomMeta.host_id===sessionState.user.id;
    panel.append(makeElement("h4","","Pembukaan kartu ekonomi"));
    panel.append(makeElement("p","muted-text",isHost
      ? "Buka satu kartu dari setiap tumpukan. Klik kartu pembuka untuk membalik seluruh empat sektor."
      : "Menunggu host membuka empat kartu ekonomi. Semua perubahan harga akan terlihat setelah dibuka."));
    const backs=makeElement("div","economy-back-stacks");
    for(const sector of SECTORS) {
      const stack=makeElement("div","economy-back-stack");
      appendCardImage(stack,"./assets/cards/components/stocklab-back-dark.webp","Tumpukan ekonomi "+sector.name,"economy-back-image");
      stack.append(makeElement("strong","",sector.name));
      const remaining = economyCardsRemaining(view.state, sector.id);
      stack.append(makeElement("small","economy-stack-count",remaining + " KARTU TERSISA"));
      backs.append(stack);
    }
    panel.append(backs);
    if(isHost) {
      const reveal=makeElement("button","economy-open-card");
      reveal.type="button";
      appendCardImage(reveal,"./assets/cards/components/stocklab-back-dark.webp",
        "Buka empat kartu ekonomi StockLab","economy-open-card-image");
      const caption=makeElement("span","economy-open-caption","BUKA 4 KARTU EKONOMI");
      reveal.append(caption);
      reveal.addEventListener("click",async()=>{
        setBusy(reveal,true,"Membuka kartu…");
        await runGameAction(()=>db.rpc("resolve_economy",{p_room_id:sessionState.roomId}),
          "Empat kartu ekonomi dibuka. Harga saham diperbarui untuk semua pemain.");
        setBusy(reveal,false);
      });
      panel.append(reveal);
    }
    ui.phaseControls.append(panel);
    return;
  }

  if (view.phase === "finished") {
    ui.phaseControls.append(makeElement("div","phase-panel finished-message","Permainan selesai. Skor akhir dihitung dari uang, nilai saham, Reksa Dana, dan pengurangan utang."));
  }
}

function tradingFeeForCard(card, own) {
  const sector = card && card.sector;
  return sector ? Math.max(0, Number(own && own.shares && own.shares[sector] || 0)) : 0;
}
function tradingFeeOnKeep(card, own) {
  // Kept Trading Fee card adds one more share in its printed sector before the tax is counted.
  return tradingFeeForCard(card, own) + 1;
}
function tradingFeeDescription(card) {
  return card && card.sector === "mutual_fund"
    ? "1 koin per unit Reksa Dana yang dimiliki"
    : "1 koin per saham " + sectorName(card && card.sector) + " yang dimiliki";
}

function displayNameFor(players,userId) {
  const player = (players||[]).find((item)=>item.user_id===userId);
  return player ? player.display_name : "pemain lain";
}

function renderActionMarket(view, own) {
  const state = view.state || {};
  const cards = Array.isArray(state.action_market) ? state.action_market : [];
  const isActive = view.phase === "action" && view.active_user_id === sessionState.user.id;
  if (!cards.some((card) => card.id === sessionState.selectedActionCardId) || !isActive) {
    sessionState.selectedActionCardId = null;
  }
  ui.actionMarket.replaceChildren();
  const activePlayer = (Array.isArray(state.players) ? state.players : [])
    .find((player) => player.user_id === view.active_user_id);
  ui.actionMarketCount.textContent = cards.length + " kartu · " +
    (isActive ? "giliranmu" : "giliran " + (activePlayer ? activePlayer.display_name : "pemain lain"));
  if (!cards.length) {
    ui.actionMarket.append(makeElement("div", "empty-state", "Pasar kartu aksi sedang kosong."));
    return;
  }
  for (const card of cards) {
    const isPicked = sessionState.selectedActionCardId === card.id;
    const panel = makeElement("article", "action-card" +
      (isActive ? " is-selectable" : " is-waiting") + (isPicked ? " is-picked" : ""));
    panel.tabIndex = -1;
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", card.title + " " + sectorName(card.sector));
    const header = makeElement("div", "action-card-header");
    header.append(makeElement("span", "action-sector", sectorName(card.sector)));
    header.append(makeElement("strong", "action-title", card.title));
    panel.append(header);
    appendCardImage(panel, actionCardAsset(card), card.title + " — " + sectorName(card.sector), "action-card-image");
    const playerCoins = Number(view.my_private_state && view.my_private_state.coins || 0);
    const keepFee = card.action === "trading-fee" ? tradingFeeOnKeep(card, own) : 0;
    const hint = card.action === "info-bursa" ? "Gunakan efek untuk mengintip 3 sektor · bonus 2 koin"
      : card.action === "quickbuy" ? "Gunakan efek untuk mengambil 2 kartu lain · giliran berikutnya dilewati"
      : card.action === "trading-fee" ? "Biaya simpan " + keepFee + " koin · gunakan efek untuk menjual aset"
      : card.action === "acquisition" ? "Gunakan efek untuk mengambil 1 saham pemain lain"
      : card.action === "rumor" ? "Gunakan efek untuk mengubah harga saham"
      : "Simpan menjadi aset atau gunakan efek kartu";
    panel.append(makeElement("small", "action-hint", hint));
    const actions = makeElement("div", "action-card-buttons");
    actions.hidden = !isActive;
    const keepButton = makeElement("button", "button secondary",
      card.action === "trading-fee"
        ? "Simpan · " + keepFee + " koin"
        : card.sector === "mutual_fund" ? "Simpan RD" : "Simpan saham");
    keepButton.type = "button";
    keepButton.title = card.action === "trading-fee"
      ? "Simpan sebagai saham " + sectorName(card.sector) + " dan bayar " + keepFee + " koin."
      : card.sector === "mutual_fund"
        ? "Simpan kartu sebagai aset Reksa Dana."
        : "Simpan kartu sebagai aset saham " + sectorName(card.sector) + ".";
    if (card.action === "trading-fee" && playerCoins < keepFee) {
      keepButton.disabled = true;
      keepButton.title = "Saldo kurang. Pajak sektor " + sectorName(card.sector) + " adalah " +
        keepFee + " koin, saldo kamu " + playerCoins + " koin.";
    }
    keepButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      setBusy(keepButton,true,"Menyimpan…");
      const keepAs = card.sector === "mutual_fund" ? "mutual_fund" : "stock";
      await runGameAction(() => db.rpc("perform_action_card", {
        p_room_id:sessionState.roomId,p_card_id:card.id,p_mode:"keep",
        p_choice:{keep_as:keepAs}
      }), card.sector === "mutual_fund"
        ? "Kartu disimpan sebagai Reksa Dana."
        : "Kartu disimpan sebagai saham " + sectorName(card.sector) + ".");
      setBusy(keepButton,false);
    });
    const activate = makeElement("button", "button primary", "Gunakan efek");
    activate.type = "button";
    activate.addEventListener("click", (event) => {
      event.stopPropagation();
      openActivationForm(card,panel,own);
    });
    actions.append(keepButton,activate);
    panel.append(actions);
    const selectThis = () => {
      if (!isActive) return;
      sessionState.selectedActionCardId = card.id;
      ui.actionMarket.querySelectorAll(".action-card").forEach((node) => {
        node.classList.toggle("is-picked", node === panel);
        const buttons = node.querySelector(".action-card-buttons");
        if (buttons) buttons.hidden = false;
      });
    };
    panel.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selectThis();
    });
    ui.actionMarket.append(panel);
  }
}

function openActivationForm(card, cardElement, own) {
  document.querySelectorAll(".action-modal-layer").forEach((node) => node.remove());
  const state = sessionState.gameView && sessionState.gameView.state || {};
  const marketCards = Array.isArray(state.action_market) ? state.action_market : [];
  const players = viewPlayers();
  const market = state.market || {};
  const modalLayer = makeElement("div", "action-modal-layer");
  modalLayer.setAttribute("role", "presentation");
  const formWrap = makeElement("div", "activation-form card-interaction");
  formWrap.setAttribute("role", "dialog");
  formWrap.setAttribute("aria-modal", "true");
  formWrap.setAttribute("aria-label", "Gunakan efek " + card.title);
  const head = makeElement("div", "card-interaction-heading");
  head.append(makeElement("small", "interaction-kicker", "GUNAKAN EFEK KARTU"));
  head.append(makeElement("strong", "", card.title + " · " + sectorName(card.sector)));
  const closeButton = makeElement("button", "action-modal-close", "×");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Tutup pilihan aksi");
  closeButton.addEventListener("click", () => modalLayer.remove());
  head.append(closeButton);
  formWrap.append(head);
  const stage = makeElement("div", "card-choice-stage");
  formWrap.append(stage);
  modalLayer.append(formWrap);
  modalLayer.addEventListener("click", (event) => {
    if (event.target === modalLayer) modalLayer.remove();
  });
  modalLayer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") modalLayer.remove();
  });
  document.body.append(modalLayer);

  const submit = async (choice, successText, button) => {
    if (!button || button.disabled) return;
    setBusy(button,true,"Memproses…");
    await runGameAction(() => db.rpc("perform_action_card", {
      p_room_id:sessionState.roomId,p_card_id:card.id,p_mode:"activate",p_choice:choice
    }),successText,() => modalLayer.remove());
    setBusy(button,false);
  };
  const sectorTile = (sector, selected, click, disabled=false) => {
    const price=Number(market[sector.id]||5);
    const tile=makeElement("button","sector-choice-tile"+(selected?" is-selected":""));
    tile.type="button";tile.disabled=disabled;
    appendCardImage(tile,sectorBoardAsset(sector.id),"Kartu sektor "+sector.name,"sector-choice-image");
    const meta=makeElement("span","sector-choice-meta");
    meta.append(makeElement("strong","",sector.name));
    meta.append(makeElement("small","","Harga "+price));
    tile.append(meta);tile.addEventListener("click",click);return tile;
  };
  const choiceCard = (other, selected, click) => {
    const tile=makeElement("button","quickbuy-choice-card"+(selected?" is-selected":""));
    tile.type="button";
    appendCardImage(tile,actionCardAsset(other),other.title+" · "+sectorName(other.sector),"quickbuy-choice-image");
    tile.append(makeElement("strong","",other.title));
    tile.append(makeElement("small","",sectorName(other.sector)));
    tile.addEventListener("click",click);return tile;
  };
  const confirmButton = (label, choice, successText, valid=true) => {
    const button=makeElement("button","button primary confirm-card-action",label);
    button.type="button";button.disabled=!valid;
    button.addEventListener("click",()=>submit(choice,successText,button));return button;
  };
  const footerWithCancel = () => {
    const footer=makeElement("div","card-interaction-footer");
    const cancel=makeElement("button","button secondary","Batal");
    cancel.type="button";cancel.addEventListener("click",()=>modalLayer.remove());
    footer.append(cancel);return footer;
  };

  if(card.action==="info-bursa") {
    const selected=new Set();
    const draw=()=>{
      stage.replaceChildren(makeElement("p","interaction-instruction","Pilih tepat dua sektor berbeda. Kartu teratas dari kedua sektor akan ditampilkan hanya kepadamu."));
      const grid=makeElement("div","sector-choice-grid");
      for(const sector of SECTORS) grid.append(sectorTile(sector,selected.has(sector.id),()=>{
        if(selected.has(sector.id)) selected.delete(sector.id);
        else if(selected.size<2) selected.add(sector.id);
        draw();
      }));
      stage.append(grid,makeElement("p","interaction-selection-count",selected.size+"/2 sektor dipilih"));
      const footer=footerWithCancel();
      footer.append(confirmButton("Intip dua sektor + ambil 2 koin",{
        sector_a:[...selected][0],sector_b:[...selected][1]
      },"Info Bursa berhasil. Hasil intipan hanya terlihat olehmu.",selected.size===2));
      stage.append(footer);
    };
    draw();return;
  }

  if(card.action==="rumor") {
    let mode="single",selectedSector=null,delta=null,doublePicks=[],pendingSector=null;
    const within=(sectorId,step)=>{
      const price=Number(market[sectorId]||5);
      return price+step>=1&&price+step<=9;
    };
    const unavailableNotice=(sectorId,step)=>{
      const price=Number(market[sectorId]||5);
      showNotice("Harga "+sectorName(sectorId)+" saat ini "+price+". Perubahan "+
        (step>0?"naik ":"turun ")+Math.abs(step)+
        " tidak tersedia karena batas harga adalah 1–9.","warning");
    };
    const directionButton=(sectorId,step,onPick)=>{
      const possible=within(sectorId,step);
      const price=Number(market[sectorId]||5);
      const btn=makeElement("button","rumor-direction"+(possible?"":" is-unavailable"),
        (step>0?"▲ Naik ":"▼ Turun ")+Math.abs(step));
      btn.type="button";
      if(!possible)btn.title="Tidak tersedia · harga "+price+" sudah mendekati batas";
      btn.addEventListener("click",()=>{
        if(!possible){unavailableNotice(sectorId,step);return;}
        onPick();
      });
      return btn;
    };
    const draw=()=>{
      stage.replaceChildren(makeElement("p","interaction-instruction",
        "Pilih pola Rumor, klik kartu sektor, lalu pilih arah perubahan. Harga saham hanya bergerak pada rentang 1–9."));
      const modes=makeElement("div","rumor-mode-tabs");
      for(const option of [{value:"single",label:"1 sektor · ±2 poin"},{value:"double",label:"2 sektor · ±1 poin"}]) {
        const tab=makeElement("button","rumor-mode-tab"+(mode===option.value?" is-selected":""),option.label);
        tab.type="button";
        tab.addEventListener("click",()=>{mode=option.value;selectedSector=null;delta=null;doublePicks=[];pendingSector=null;draw();});
        modes.append(tab);
      }
      stage.append(modes);
      if(mode==="single") {
        const grid=makeElement("div","sector-choice-grid");
        for(const sector of SECTORS)grid.append(sectorTile(sector,selectedSector===sector.id,()=>{
          selectedSector=sector.id;delta=null;draw();
        }));
        stage.append(makeElement("small","interaction-label","Pilih satu sektor saham"),grid);
        if(selectedSector) {
          const price=Number(market[selectedSector]||5);
          stage.append(makeElement("p","interaction-current-price",sectorName(selectedSector)+" · harga sekarang "+price));
          const dirs=makeElement("div","rumor-direction-row");
          dirs.append(directionButton(selectedSector,2,()=>{delta=2;draw();}),
            directionButton(selectedSector,-2,()=>{delta=-2;draw();}));
          stage.append(dirs);
          if(delta!==null) {
            stage.append(makeElement("p","rumor-result-preview",sectorName(selectedSector)+": "+price+" → "+(price+delta)+" poin"));
            const footer=footerWithCancel();
            footer.append(confirmButton("Terapkan perubahan harga",{
              mode:"single",sector:selectedSector,delta
            },"Rumor berhasil mengubah harga "+sectorName(selectedSector)+".",true));
            stage.append(footer);
          }
        }
      } else {
        if(doublePicks.length<2&&!pendingSector) {
          const grid=makeElement("div","sector-choice-grid");
          for(const sector of SECTORS) {
            const already=doublePicks.some(p=>p.sector===sector.id);
            grid.append(sectorTile(sector,false,()=>{if(!already){pendingSector=sector.id;draw();}},already));
          }
          stage.append(makeElement("small","interaction-label",
            doublePicks.length===0?"Pilih sektor pertama":"Pilih sektor kedua yang berbeda"),grid);
        }
        if(pendingSector) {
          const price=Number(market[pendingSector]||5);
          stage.append(makeElement("p","interaction-current-price",sectorName(pendingSector)+" · harga sekarang "+price+" · pilih 1 poin"));
          const dirs=makeElement("div","rumor-direction-row");
          dirs.append(directionButton(pendingSector,1,()=>{doublePicks.push({sector:pendingSector,delta:1});pendingSector=null;draw();}),
            directionButton(pendingSector,-1,()=>{doublePicks.push({sector:pendingSector,delta:-1});pendingSector=null;draw();}));
          stage.append(dirs);
        }
        if(doublePicks.length) {
          const recap=makeElement("div","rumor-selection-list");
          for(const item of doublePicks) {
            const price=Number(market[item.sector]||5);
            recap.append(makeElement("span","",sectorName(item.sector)+": "+price+" → "+(price+item.delta)));
          }
          stage.append(recap);
        }
        if(doublePicks.length===2) {
          const footer=footerWithCancel();
          footer.append(confirmButton("Terapkan kedua perubahan",{
            mode:"double",sector_a:doublePicks[0].sector,delta_a:doublePicks[0].delta,
            sector_b:doublePicks[1].sector,delta_b:doublePicks[1].delta
          },"Rumor berhasil mengubah dua harga saham.",true));
          stage.append(footer);
        }
      }
    };
    draw();return;
  }

  if(card.action==="quickbuy") {
    const available=marketCards.filter(item=>item.id!==card.id);
    const selected=new Set();
    const draw=()=>{
      stage.replaceChildren(makeElement("p","interaction-instruction",
        "Pilih dua kartu aksi lain untuk disimpan sebagai saham. Setelah konfirmasi, giliran berikutnya milikmu otomatis dilewati jika masih ada kartu di pasar."));
      const grid=makeElement("div","quickbuy-choice-grid");
      for(const other of available)grid.append(choiceCard(other,selected.has(other.id),()=>{
        if(selected.has(other.id))selected.delete(other.id);
        else if(selected.size<2)selected.add(other.id);
        draw();
      }));
      stage.append(grid,makeElement("p","interaction-selection-count",selected.size+"/2 kartu dipilih"));
      const footer=footerWithCancel();
      footer.append(confirmButton("Ambil dua kartu pilihan",{card_ids:[...selected]},
        "Quickbuy mengambil dua kartu pilihanmu. Giliran berikutnya dilewati jika masih ada kartu di pasar.",selected.size===2));
      stage.append(footer);
    };
    if(available.length<2)stage.append(makeElement("p","muted-text","Tidak cukup kartu lain untuk Quickbuy."));
    else draw();
    return;
  }

  if(card.action==="trading-fee") {
    const fee=tradingFeeForCard(card,own);
    const coins=Number(sessionState.gameView&&sessionState.gameView.my_private_state&&
      sessionState.gameView.my_private_state.coins||0);
    const sellable=SECTORS.filter(sector=>Number(own&&own.shares&&own.shares[sector.id]||0)>0)
      .map(sector=>sector.id);
    let selectedSector=sellable[0]||null,quantity=1;
    const draw=()=>{
      stage.replaceChildren(makeElement("p","interaction-instruction",
        "Pilih saham yang akan dijual. Pajak kartu dihitung dari jumlah saham " +
        sectorName(card.sector) + " yang kamu pegang, bukan dari seluruh portofolio."));
      stage.append(makeElement("div","trading-fee-equation","Biaya: "+fee+" koin · Saldo: "+coins+" koin"));
      const grid=makeElement("div","asset-choice-grid");
      for(const key of sellable) {
        const tile=makeElement("button","asset-choice-card"+(selectedSector===key?" is-selected":""));
        tile.type="button";
        appendCardImage(tile,shareCardAsset(key),sectorName(key),"asset-choice-image");
        tile.append(makeElement("strong","",sectorName(key)));
        tile.append(makeElement("small","",Number(own.shares[key])+" kartu"));
        tile.addEventListener("click",()=>{selectedSector=key;quantity=1;draw();});
        grid.append(tile);
      }
      stage.append(grid);
      if(selectedSector) {
        const owned=Number(own.shares[selectedSector]||0);
        const pair=Array.isArray(state.mutual_fund_pair)?state.mutual_fund_pair:["consumer","agriculture"];
        const unitPrice=selectedSector==="mutual_fund"
          ? Math.floor((Number(market[pair[0]]||0)+Number(market[pair[1]]||0))/2)
          : Number(market[selectedSector]||0);
        const proceeds=unitPrice*quantity,net=proceeds-fee;
        const detail=makeElement("div","selected-asset-detail");
        detail.append(makeElement("strong","",sectorName(selectedSector)));
        const stepper=makeElement("div","quantity-stepper");
        const minus=makeElement("button","stepper-button","−"),plus=makeElement("button","stepper-button","+");
        minus.type=plus.type="button";
        minus.disabled=quantity<=1;plus.disabled=quantity>=owned;
        const count=makeElement("strong","quantity-value",String(quantity));
        minus.addEventListener("click",()=>{quantity=Math.max(1,quantity-1);draw();});
        plus.addEventListener("click",()=>{quantity=Math.min(owned,quantity+1);draw();});
        stepper.append(minus,count,plus);
        detail.append(stepper,makeElement("p","sale-preview",
          quantity+" × "+unitPrice+" koin = "+proceeds+" koin · setelah biaya: "+net+" koin"));
        if(coins<fee)detail.append(makeElement("small","interaction-warning","Saldo kurang "+(fee-coins)+" koin untuk membayar biaya."));
        const footer=footerWithCancel();
        footer.append(confirmButton("Bayar biaya & jual aset",{
          sell_sector:selectedSector,quantity
        },"Trading Fee dibayar dan penjualan selesai.",sellable.length>0&&coins>=fee));
        detail.append(footer);stage.append(detail);
      }
      if(!sellable.length)stage.append(makeElement("p","interaction-warning","Tidak ada aset yang bisa dijual."));
    };
    draw();return;
  }

  if(card.action==="acquisition") {
    let selectedSector=card.sector==="mutual_fund"?null:card.sector,selectedTarget=null;
    const eligibleTargets=(sector)=>{
      if(!sector)return [];
      const ownCount=Math.max(0,Number(own&&own.shares&&own.shares[sector]||0));
      return players.filter(player=>{
        const targetCount=Math.max(0,Number(player.shares&&player.shares[sector]||0));
        return player.user_id!==sessionState.user.id && targetCount>0 && targetCount<=ownCount;
      });
    };
    const draw=()=>{
      stage.replaceChildren(makeElement("p","interaction-instruction",
        "Akuisisi memindahkan satu saham dari pemain lain. Kamu harus memiliki saham sektor yang sama minimal sebanyak target."));
      if(card.sector==="mutual_fund") {
        stage.append(makeElement("small","interaction-label","Pilih sektor saham yang akan diakuisisi"));
        const sectors=makeElement("div","sector-choice-grid");
        for(const sector of SECTORS) {
          const canOwn=Number(own&&own.shares&&own.shares[sector.id]||0)>0;
          sectors.append(sectorTile(sector,selectedSector===sector.id,()=>{
            selectedSector=sector.id;selectedTarget=null;draw();
          },!canOwn));
        }
        stage.append(sectors);
      }
      if(selectedSector) {
        const targets=eligibleTargets(selectedSector);
        stage.append(makeElement("small","interaction-label","Pilih pemain target untuk sektor "+sectorName(selectedSector)));
        const targetGrid=makeElement("div","acquisition-target-grid");
        for(const player of targets) {
          const target=makeElement("button","acquisition-target-card"+(selectedTarget===player.user_id?" is-selected":""));
          target.type="button";
          target.append(makeElement("span","target-avatar",String(player.display_name||"P").slice(0,1).toUpperCase()));
          target.append(makeElement("strong","",player.display_name));
          target.append(makeElement("small","",Number(player.shares[selectedSector])+
            " saham · kamu "+Number(own.shares&&own.shares[selectedSector]||0)+
            " saham · setara boleh"));
          target.addEventListener("click",()=>{selectedTarget=player.user_id;draw();});
          targetGrid.append(target);
        }
        if(!targets.length) {
          const ownCount = Math.max(0,Number(own&&own.shares&&own.shares[selectedSector]||0));
          const opponentsWithShares = players.filter(player =>
            player.user_id!==sessionState.user.id &&
            Number(player.shares&&player.shares[selectedSector]||0)>0
          );
          const reason = ownCount===0
            ? "Kamu belum memiliki saham " + sectorName(selectedSector) + "."
            : opponentsWithShares.length===0
              ? "Belum ada pemain lain yang memiliki saham " + sectorName(selectedSector) + "."
              : "Saham pemain lain pada sektor ini lebih banyak daripada milikmu.";
          targetGrid.append(makeElement("p","interaction-warning",
            "Belum ada target Akuisisi yang memenuhi syarat. " + reason +
            " Syarat: saham milikmu harus sama atau lebih banyak dari target."));
        }
        stage.append(targetGrid);
        if(selectedTarget) {
          const footer=footerWithCancel();
          footer.append(confirmButton("Ambil 1 saham dari "+displayNameFor(players,selectedTarget),{
            ...(card.sector==="mutual_fund"?{target_sector:selectedSector}:{}),target_user_id:selectedTarget
          },"Akuisisi berhasil mengambil 1 saham.",true));
          stage.append(footer);
        }
      }
    };
    if(card.sector==="mutual_fund"&&!SECTORS.some(s=>Number(own&&own.shares&&own.shares[s.id]||0)>0)) {
      stage.append(makeElement("p","interaction-warning","Kamu harus memiliki sedikitnya satu saham sektor biasa untuk menjalankan Akuisisi."));
    } else draw();
  }
}


function viewPlayers() {
  return sessionState.gameView && sessionState.gameView.state && Array.isArray(sessionState.gameView.state.players)
    ? sessionState.gameView.state.players : [];
}

async function runGameAction(request, successMessage, afterSuccess) {
  clearNotice();
  try {
    const { error } = await request();
    if (error) throw error;
    if (typeof afterSuccess === "function") afterSuccess();
    await loadActiveGame();
    if (successMessage) showNotice(successMessage,"success");
    return true;
  } catch(error) {
    console.error("Game action failed:",error);
    showNotice(errorMessage(error),"error");
    await loadActiveGame();
    return false;
  }
}

function renderFinalScores(state) {
  ui.finalScores.replaceChildren();
  const scores=Array.isArray(state.final_scores)?state.final_scores:[];
  const winner=state.winner_user_id;
  for(const score of [...scores].sort((a,b)=>Number(b.total_assets)-Number(a.total_assets) || Number(a.order_no)-Number(b.order_no))){
    const row=makeElement("article","score-card"+(score.user_id===winner?" winner":""));
    row.append(makeElement("strong","",score.display_name+(score.user_id===winner?" · PEMENANG":"")));
    row.append(makeElement("span","score-total",Number(score.total_assets).toLocaleString("id-ID")+" poin"));
    row.append(makeElement("small","","Uang "+score.coins+" · Saham "+score.stock_value+" · Reksa Dana "+score.mutual_fund_value+" · Utang -"+score.debt_penalty));
    ui.finalScores.append(row);
  }
}

function subscribeToRoom() {
  if (!sessionState.roomId || !db) return;
  if (sessionState.channel) db.removeChannel(sessionState.channel);
  const roomId=sessionState.roomId;
  sessionState.channel=db.channel("stocklab-room-"+roomId)
    .on("postgres_changes",{event:"*",schema:"public",table:"room_members",filter:"room_id=eq."+roomId},async()=>{await syncRoomState();})
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"room_status_events",filter:"room_id=eq."+roomId},async()=>{await refreshRoomActivity();})
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"rooms",filter:"id=eq."+roomId},async()=>{await syncRoomState();})
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"rooms",filter:"id=eq."+roomId},async()=>{
      if (sessionState.channel) { await db.removeChannel(sessionState.channel); sessionState.channel=null; }
      if (sessionState.phaseTimerHandle) { window.clearInterval(sessionState.phaseTimerHandle); sessionState.phaseTimerHandle=null; }
      sessionState.roomId=null; sessionState.roomCode=""; sessionState.roomMeta=null;
      sessionState.members=[]; sessionState.gameView=null;
      ui.lobby.hidden=true; ui.gameTable.hidden=true;
      showRoomHub();
      showNotice("Room dibubarkan karena melewati batas waktu tidak aktif.","warning");
      await refreshOpenRooms();
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"games",filter:"room_id=eq."+roomId},async()=>{await loadActiveGame();})
    .subscribe((status)=>{
      if(status==="SUBSCRIBED")setConnection("Terhubung",true);
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setConnection("Menghubungkan ulang");
    });
}

async function saveRoomSettings(event) {
  event.preventDefault();
  if (!sessionState.roomId || !sessionState.roomMeta ||
      sessionState.roomMeta.host_id !== sessionState.user.id) return;
  setBusy(ui.saveRoomSettings, true, "Menyimpan…");
  try {
    const { error } = await db.rpc("update_room_settings", {
      p_room_id: sessionState.roomId,
      p_bidding_seconds: Number(ui.lobbyBiddingSeconds.value),
      p_turn_seconds: Number(ui.lobbyTurnSeconds.value),
      p_idle_timeout_minutes: Number(ui.lobbyIdleMinutes.value)
    });
    if (error) throw error;
    const { data, error: roomError } = await db.from("rooms")
      .select("id,invite_code,host_id,max_players,status,bidding_seconds,turn_seconds,idle_timeout_minutes,last_activity_at")
      .eq("id", sessionState.roomId).maybeSingle();
    if (roomError) throw roomError;
    if (data) sessionState.roomMeta = data;
    await refreshLobby();
    showNotice("Pengaturan room berhasil disimpan.", "success");
  } catch (error) {
    showNotice(errorMessage(error), "error");
  } finally {
    setBusy(ui.saveRoomSettings, false);
  }
}

async function toggleReady() {
  if(!sessionState.roomId||!sessionState.user||!sessionState.roomMeta||sessionState.roomMeta.status!=="waiting")return;
  const current=sessionState.members.find(member=>member.user_id===sessionState.user.id);
  if(!current)return;
  setBusy(ui.readyButton,true,"Menyimpan…");
  try{
    const {error}=await db.from("room_members").update({is_ready:!current.is_ready})
      .eq("room_id",sessionState.roomId).eq("user_id",sessionState.user.id);
    if(error)throw error;
    await refreshLobby();
  }catch(error){showNotice(errorMessage(error),"error");}
  finally{setBusy(ui.readyButton,false);}
}

async function leaveRoom(button = ui.leaveButton) {
  if (!sessionState.roomId) return;
  setBusy(button, true, "Keluar…");
  try {
    const { error } = await db.rpc("leave_room", { p_room_id: sessionState.roomId });
    if (error) throw error;
    if (sessionState.channel) {
      await db.removeChannel(sessionState.channel);
      sessionState.channel = null;
    }
    if (sessionState.phaseTimerHandle) {
      window.clearInterval(sessionState.phaseTimerHandle);
      sessionState.phaseTimerHandle = null;
    }
    sessionState.autoTimeoutPending = false;
    sessionState.roomId = null;
    sessionState.roomCode = "";
    sessionState.roomMeta = null;
    sessionState.members = [];
    sessionState.gameView = null;
    ui.lobby.hidden = true;
    ui.gameTable.hidden = true;
    showRoomHub();
    setConnection("Terhubung", true);
    await refreshOpenRooms();
  } catch (error) {
    showNotice(errorMessage(error), "error");
  } finally {
    setBusy(button, false);
  }
}

function readSitePreferences() {
  try {
    return JSON.parse(localStorage.getItem("stocklab_site_preferences") || "{}");
  } catch (_) {
    return {};
  }
}

function applySitePreferences(preferences = {}) {
  const theme = preferences.theme === "forest" ? "forest" : "midnight";
  const textSize = preferences.textSize === "large" ? "large" : "normal";
  const density = preferences.roomDensity === "compact" ? "compact" : "comfortable";
  const reduceMotion = Boolean(preferences.reduceMotion);
  document.body.dataset.interfaceTheme = theme;
  document.body.classList.toggle("ui-large-text", textSize === "large");
  document.body.classList.toggle("ui-compact-cards", density === "compact");
  document.body.classList.toggle("ui-reduced-motion", reduceMotion);
  if (ui.settingTheme) ui.settingTheme.value = theme;
  if (ui.settingTextSize) ui.settingTextSize.value = textSize;
  if (ui.settingRoomDensity) ui.settingRoomDensity.value = density;
  if (ui.settingReduceMotion) ui.settingReduceMotion.checked = reduceMotion;
}

function loadSitePreferences() {
  const preferences = readSitePreferences();
  applySitePreferences(preferences);
  const savedName = localStorage.getItem("stocklab_guest_username") || "";
  if (savedName && ui.profileSettingsName) ui.profileSettingsName.value = savedName;
}

ui.profileSettingsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = cleanPlayerName(ui.profileSettingsName.value || "");
  const currentName = cleanPlayerName(sessionState.username || "");
  if (name && (name.length < 2 || name.length > 24)) {
    showNotice("Nama pemain harus terdiri dari 2 sampai 24 karakter.", "warning");
    return;
  }
  if (name && name !== currentName && sessionState.roomId) {
    showNotice("Preferensi tersimpan, tetapi nama pemain baru berlaku setelah kamu keluar dari room.", "warning");
  } else if (name && name !== currentName) {
    sessionState.username = name;
    localStorage.setItem("stocklab_guest_username", name);
    ui.usernameInput.value = name;
    ui.playerName.textContent = name;
    ui.playerAvatar.textContent = name.slice(0, 1).toUpperCase();
    ui.playerPill.hidden = false;
  }
  const preferences = {
    theme: ui.settingTheme.value,
    textSize: ui.settingTextSize.value,
    roomDensity: ui.settingRoomDensity.value,
    reduceMotion: ui.settingReduceMotion.checked
  };
  localStorage.setItem("stocklab_site_preferences", JSON.stringify(preferences));
  applySitePreferences(preferences);
  if (!(name && name !== currentName && sessionState.roomId)) {
    showNotice("Pengaturan website berhasil disimpan di perangkat ini.", "success");
  }
});
document.querySelectorAll(".side-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".side-link").forEach(item => item.classList.toggle("is-active", item === link));
  });
});
ui.enterForm.addEventListener("submit",enterAsGuest);
ui.showCreatePanel.addEventListener("click",openCreatePanel);
ui.backFromCreate.addEventListener("click",showRoomHub);
ui.createForm.addEventListener("submit",createRoom);
ui.joinForm.addEventListener("submit",(event)=>{
  event.preventDefault();
  joinRoom(ui.joinInput.value,ui.joinPassword.value);
});
ui.refreshRooms.addEventListener("click",refreshOpenRooms);
ui.readyButton.addEventListener("click",toggleReady);
ui.startButton.addEventListener("click",startGame);
ui.leaveButton.addEventListener("click", () => leaveRoom(ui.leaveButton));
ui.leaveGameButton.addEventListener("click", () => leaveRoom(ui.leaveGameButton));
ui.roomSettingsForm.addEventListener("submit", saveRoomSettings);
ui.copyCode.addEventListener("click",async()=>{
  try{
    await navigator.clipboard.writeText(sessionState.roomCode);
    ui.copyCode.textContent="Tersalin";
    window.setTimeout(()=>{ui.copyCode.textContent="Salin kode";},1500);
  }catch(_){showNotice("Salin kode secara manual: "+sessionState.roomCode,"info");}
});

const rememberedName=localStorage.getItem("stocklab_guest_username");
if(rememberedName) { ui.usernameInput.value=rememberedName; if (ui.profileSettingsName) ui.profileSettingsName.value=rememberedName; }
loadSitePreferences();
if(!db){
  showNotice("Library Supabase gagal dimuat. Periksa koneksi lalu muat ulang halaman.","error");
  setConnection("Gagal dimuat");
}else{
  restoreExistingGuest();
}
