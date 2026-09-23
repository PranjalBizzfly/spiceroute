async function check() {
  const res = await fetch('http://localhost:3000/stories/predictions');
  const html = await res.text();
  const matches = [...html.matchAll(/<img[^>]*class="ed-gcard__img"[^>]*>/g)];
  console.log(`Found ${matches.length} card images`);
  for (let i = 0; i < Math.min(3, matches.length); i++) {
    console.log(`Card ${i + 1}:`, matches[i][0]);
  }
}
check();
