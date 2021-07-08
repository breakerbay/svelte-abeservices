<script>
  import Router from 'svelte-spa-router'
  import routes from './routes.js';

  import Navbar from './components/Navbar.svelte';
</script>

<Navbar />

<div>
    <Router {routes} />
</div>

<footer>
    <p>I am the footer !!!</p>
</footer>
