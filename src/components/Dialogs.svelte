<script lang="ts">
  import { app, layout, setGame, setDialog, t } from '../lib/store.svelte';
  import * as E from '../lib/engine';
  import Scoreboard from './Scoreboard.svelte';
  import Switches from './Switches.svelte';
  import Stepper from './Stepper.svelte';

  const d = $derived(app.dialog);
  const g = $derived(app.game);
  const r = $derived(g.round);
  const close = () => setDialog(null);
  const backdrop = (e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };
  // Choices made in a dialog (Second Chance used / given, duplicate bust, action targets) complete the turn at once;
  // only during a Flip 3 do they stay selected until "Continue".
  const upd = (nr: E.Round) => {
    const ng = { ...g, round: nr };
    setGame(E.inFlip3(nr) ? ng : E.confirmTurn(ng));
    close();
  };

  const pickTarget = (round: E.Round, kind: 'freeze' | 'flip3', target: number) => upd(E.setActionTarget(round, kind, target));

  // ---- edit hand ----
  const editPlayer = $derived(d?.t === 'edit' ? d.player : 0);
  const edited = $derived(r ? r.hands[editPlayer] : null);
  const othersMods = $derived(
    new Set(r ? r.hands.flatMap((h, i) => (i === editPlayer ? [] : h.mods)) : []),
  );
  const change = (f: (h: E.Hand) => void) => {
    const h = structuredClone($state.snapshot(edited)) as E.Hand;
    f(h);
    const ng = E.editHand(g, editPlayer, h);
    setGame(ng);
    if (ng.phase !== 'play') close();
  };
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const statusLabel = (s: E.Status) => ({ active: t('sActive'), stayed: t('sStayed'), busted: t('sBusted'), frozen: t('sFrozen') })[s];

  const abort = () => {
    app.setupNames = [...g.players];
    setGame({ phase: 'setup', target: g.target, players: [], history: [], round: null });
    close();
  };
</script>

{#if d}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="scrim" onclick={backdrop}>
    <div class="sheet">
      {#if d.t === 'target' && r}
        {@const kind = d.kind}
        <div class="big-icon">{kind === 'flip3' ? '✋' : '❄'}</div>
        <h3>{kind === 'flip3' ? t('targetFlip3') : t('targetFreeze')}</h3>
        <p>{t('activeOnly')}</p>
        <div class="plist">
          {#each E.actionTargets(r) as i}
            <button class="prow" onclick={() => pickTarget(r, kind, i)}>
              <span class="n">{i === E.curPlayer(r) ? t('you', { name: g.players[i] }) : g.players[i]}</span>
              <span class="s">{E.totals(g)[i]}</span>
            </button>
          {/each}
        </div>
        <button class="btn bad" onclick={close}>{t('cancel')}</button>
      {:else if d.t === 'dup' && r}
        {@const n = d.n}
        {@const who = g.players[E.curPlayer(r)]}
        <div class="big-icon">♥</div>
        <h3>{t('dupTitle', { n })}</h3>
        <p>{t('dupText', { n, name: who })}</p>
        <button class="btn primary big" onclick={() => upd(E.resolveDup(r, n, true))}>{t('useSc')}</button>
        <button class="btn bad" onclick={() => upd(E.resolveDup(r, n, false))}>{t('bustAnyway')}</button>
      {:else if d.t === 'selDup' && r}
        {@const n = d.n}
        {@const me = E.preview(r)[E.curPlayer(r)]}
        <div class="big-icon">🂠</div>
        <h3>{t('selDupTitle', { n })}</h3>
        <p>{t('selDupText', { n, name: g.players[E.curPlayer(r)] })}</p>
        <button class="btn" onclick={() => upd(E.deselectNumber(r, n))}>{t('removeCard')}</button>
        {#if me.sc}<button class="btn primary big" onclick={() => upd(E.resolveDup(r, n, true))}>{t('dupSc')}</button>{/if}
        <button class="btn bad {me.sc ? '' : 'big'}" onclick={() => upd(E.resolveDup(r, n, false))}>{t('dupBust')}</button>
      {:else if d.t === 'scgive' && r}
        {@const eligible = E.scEligible(r)}
        {@const who = g.players[E.curPlayer(r)]}
        <div class="big-icon">♥</div>
        {#if eligible.length > 0}
          <h3>{t('giveScTitle')}</h3>
          <p>{t('giveScText', { name: who })}</p>
          <div class="plist">
            {#each eligible as i}
              <button class="prow" onclick={() => upd(E.giveSecondChance(r, i))}>
                <span class="n">{g.players[i]}</span><span class="s">{E.totals(g)[i]}</span>
              </button>
            {/each}
          </div>
        {:else}
          <h3>{t('noScTitle')}</h3>
          <p>{t('noScText', { name: who })}</p>
          <button class="btn primary big" onclick={() => upd(E.giveSecondChance(r, null))}>{t('discard')}</button>
        {/if}
      {:else if d.t === 'menu'}
        <h3>{t('menu')}</h3>
        {#if !layout.tablet}<button class="btn" onclick={() => setDialog({ t: 'board' })}>{t('scoreboard')}</button>{/if}
        {#if g.phase === 'play'}<button class="btn" onclick={() => setDialog({ t: 'edit', player: E.curPlayer(r!) })}>{t('editHand')}</button>{/if}
        <div style="display:flex;justify-content:center"><Switches /></div>
        <button class="btn bad" onclick={() => setDialog({ t: 'abort' })}>{t('abortGame')}</button>
        <button class="btn" onclick={close}>{t('close')}</button>
      {:else if d.t === 'board' && r}
        <h3>{t('scoreboard')}</h3>
        <Scoreboard />
        <button class="btn" onclick={close}>{t('close')}</button>
      {:else if d.t === 'abort'}
        <h3>{t('abortGame')}</h3>
        <p>{t('abortText')}</p>
        <button class="btn bad big" onclick={abort}>{t('abort')}</button>
        <button class="btn" onclick={close}>{t('cancel')}</button>
      {:else if d.t === 'edit' && r && edited}
        <h3>{t('editHand')}</h3>
        <div class="chips">
          {#each g.players as name, i}<button class:on={i === editPlayer} onclick={() => setDialog({ t: 'edit', player: i })}>{name}</button>{/each}
        </div>
        <div class="label">{t('number')}</div>
        <div class="edit-grid">
          {#each E.NUMBERS as v}
            <button class="num" class:sel={edited.nums.includes(v)} onclick={() => change((h) => (h.nums = toggle(h.nums, v).sort((a, b) => a - b)))}>{v}</button>
          {/each}
        </div>
        <div class="label">{t('modifier')}</div>
        <div class="grid g6">
          {#each E.MODS as m}
            <button class="mod-b" class:sel={edited.mods.includes(m)} class:gone={othersMods.has(m)} disabled={othersMods.has(m)}
              onclick={() => change((h) => (h.mods = toggle(h.mods, m)))}>{m === 'x2' ? '×2' : m}</button>
          {/each}
        </div>
        <div class="chips">
          <button class="sc" class:on={edited.sc} onclick={() => change((h) => (h.sc = !h.sc))}>♥ {t('secondChance')}</button>
        </div>
        <div class="label">{t('status')}</div>
        <div class="chips">
          {#each ['active', 'stayed', 'busted', 'frozen'] as const as s}
            <button class:on={edited.status === s} onclick={() => change((h) => { h.status = s; if (s !== 'busted') h.bustNum = null; })}>{statusLabel(s)}</button>
          {/each}
        </div>
        <p>{t('editHandHint')}</p>
        <button class="btn primary" onclick={close}>{t('done')}</button>
      {:else if d.t === 'fix'}
        {@const player = d.player}
        <h3>{t('fixScore')}</h3>
        <div class="chips">
          {#each g.players as name, i}<button class:on={i === player} onclick={() => setDialog({ t: 'fix', player: i })}>{name}</button>{/each}
        </div>
        {#key player}
          {@const last = g.history.length - 1}
          <p>{t('fixScoreFor', { name: g.players[player] })}</p>
          <Stepper value={g.history[last].scores[player]} step={1} min={-999} oninput={(v) => setGame(E.fixScore(g, player, v))} />
        {/key}
        <button class="btn primary" onclick={close}>{t('done')}</button>
      {:else if d.t === 'score'}
        <h3>{t('winningScore')}</h3>
        <Stepper value={g.target} step={10} min={10} oninput={(v) => setGame({ ...g, target: v })} />
        <div class="presets">
          {#each [100, 200, 300] as v}<button class="btn" style={g.target === v ? 'border-color:var(--accent)' : ''} onclick={() => setGame({ ...g, target: v })}>{v}</button>{/each}
        </div>
        <button class="btn primary" onclick={close}>{t('ok')}</button>
      {/if}
    </div>
  </div>
{/if}
