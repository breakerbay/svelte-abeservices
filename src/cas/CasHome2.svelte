<script>
</script>

<svelte:head>
    <title>ABE Services - CAS 2</title>
</svelte:head>

<div class="home-page-grid">
    <div class="card quality-quotes-card">
        <h1 class="quotes-heading">CAS - The Key to Quality</h1>
        <div class="quotes">
            <p class="quote1">Quality means doing it right when no one is looking. Henry Ford</p>
            <p class="quote2">"It is not necessary to change. Survival is not mandatory." Deming</p>
            <p class="quote3">The bitterness of poor quality remains long after low pricing is forgotten.</p>
            <p class="quote4">Quality is generally transparent when present, but easily recognized in its absence.
                Gillies</p>
            <p class="quote5">Quality is to give the customers what they want. Walton</p>
            <p class="quote6">Uncontrolled variation is the enemy of quality. Deming</p>
            <p class="quote7">"Be a yardstick of quality. Some people aren't used to an environment where excellence is
                expected." Jobs
        </div>
    </div>
    <div class="card">
        <h4>CAS:</h4>
        <ul>
            <li>Takes the tedium out of setting up ITPs and checklists;</li>
            <li>Enables photos to be used to document critical points;</li>
            <li>Provides impressive reports to demonstrate compliance;</li>
            <li>Facilitates handling nonconformance</li>
        </ul>
        <h4>Find out more about:</h4>
        <ul>
            <li>How CAS works</li>
            <li>How CAS can benefit Contractors</li>
            <li>How CAS can benefit Designers</li>
            <li>How CAS can benefit Clients, Superintendents, and others engaging or monitoring constructors</li>
        </ul>
        <h4>Sign up Now</h4>
    </div>
</div>

<style>

    p {
        font-family: Impact, sans-serif;
        text-transform: uppercase;
    }

/*
    main {
        display: block;
    }
*/

    .home-page-grid {
        display: grid;
        grid-template-columns: 2fr auto;
        grid-gap: 2em;
        margin: 2rem;
        max-width: 1300px;
        font-family: Verdana, sans-serif;
    }

    .card {
        margin: 0;
        padding: 0.5em;
        max-width: 300px;
        min-width: 300px;
    }

    .quality-quotes-card {
        background-image: url("/images/background.png");
        background-repeat: no-repeat;
        background-size: cover;
        min-height: 45rem;
        margin: 0;
        padding: 0.5em;
        max-width: 1000px;
        min-width: 700px;
    }

    .quotes-heading {
        color: darkslategray;
        color: #301d1d;
        color: #100a0a;
        text-align: center;
        margin-top: 5rem;
        margin-bottom: 4rem;
    }

    .quotes {
        margin-left: 4rem;
        padding-top: 1rem;
    }

    .quote1 {
        color: orange;
        color: #E2750F;
        width: 33%;
    }

    .quote2 {
        color: darkblue;
        color: #0D42B2;
    }

    .quote3 {
        color: #cc0000;
        width: 33%;
    }

    .quote4 {
        color: #921C60;
        width: 40%;
    }

    .quote5 {
        color: #E2750F;
    }

    .quote6 {
        color: #086A6A;
    }

    .quote7 {
        color: #0C3893;
        width: 43%;
    }


    @media (max-width: 1100px) {
        .home-page-grid {
            display: block;
            margin: 0.2rem;
        }

        .card {
            max-width: 1000px;
        }
    }
</style>
