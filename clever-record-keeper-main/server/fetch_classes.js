(async () => {
  try {
    const res = await fetch('http://localhost:4000/api/classes/meta');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch failed:', err);
  }
})();
