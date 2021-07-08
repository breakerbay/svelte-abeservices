<script>
  import Router from 'svelte-spa-router'
  import routes from './routes.js';

  import Navbar from './components/Navbar.svelte';
</script>

<Navbar />

<div>
    <Router {routes} />
</div>

<div class="f-container fixed-hf">
    <div class="main">
    <p>add or remove "fixed-hf" to have fixed header and footer and scrollable main section</p>
    a<br/>
    b<br/>
    c<br/>
    <div style="display:block">
      <p>change none/block to test shorter content</p>
    d<br/>
    e<br/>
    f<br/>
    g<br/>
    h<br/>
    i<br/>
    j<br/>
    k<br/>
    l<br/>
    m<br/>
    n<br/>
    o<br/>
    p<br/>
    q<br/>
    r<br/>
    s<br/>
    t<br/>
    u<br/>
    v<br/>
    w<br/>
    x<br/>
    y<br/>
    z<br/>
    </div>
  </div>

  <footer>
    <p>I am the footer !!!</p>
  </footer>
</div>
