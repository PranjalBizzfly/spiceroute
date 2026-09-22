const res = await fetch("http://localhost:3002/stories/welcome-aboard");
const text = await res.text();
const titles = [...text.matchAll(/class="ed-gcard__title">([^<]+)</g)].map(m => m[1]);
console.log("Rendered story count:", titles.length);
console.log(titles);
