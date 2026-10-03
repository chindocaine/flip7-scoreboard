<script lang="ts">
  let { value, step = 10, min = 0, oninput }: { value: number; step?: number; min?: number; oninput: (v: number) => void } = $props();
  const set = (v: number) => oninput(Math.max(min, Math.round(v)));
</script>

<div class="stepper">
  <button class="b" onclick={() => set(value - step)}>−</button>
  <input type="number" inputmode="numeric" {value} oninput={(e) => set(+e.currentTarget.value || 0)} />
  <button class="b" onclick={() => set(value + step)}>+</button>
</div>
