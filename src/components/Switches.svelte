<script lang="ts">
  import { app, save } from '../lib/store.svelte';
</script>

<div class="switches">
  <div class="seg">
    <button class:on={app.lang === 'en'} onclick={() => { app.lang = 'en'; save(); }}>EN</button>
    <button class:on={app.lang === 'de'} onclick={() => { app.lang = 'de'; save(); }}>DE</button>
  </div>
  <div class="seg">
    <button class:on={app.theme === 'light'} aria-label="Light" onclick={() => { app.theme = 'light'; save(); }}>☀</button>
    <button class:on={app.theme === 'dark'} aria-label="Dark" onclick={() => { app.theme = 'dark'; save(); }}>☾</button>
  </div>
</div>
