<script>
    const photos = (async () => {
        const response = await fetch('http://brogo.net.au/checklist/api/gallery')
        return await response.json()
    })()
</script>

<style>
    .wrapper {
        max-width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(25em, 1fr));
        grid-auto-rows: minmax(10em, auto);
        gap: 3em;
        background-color: #fff;
        color: #444;
    }

    .box {
        background-color: rgb(120, 70, 123);
        border: 5px solid rgb(88, 55, 112);
        color: #fff;
        margin-right: 2em;
        border-radius: 5px;
        padding: 20px;
        font: 150%/1.3 "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans",
        Geneva, Verdana, sans-serif;
    }
</style>


{#await photos}
    <p>...waiting</p>
{:then data}
    <div class="wrapper">
        {#each data as photo}
            <div class="box">
                <div>
                    <img src={photo.url} alt={photo.title} />
                </div>
                <div>
                    <p>
                        {photo.title}
                    </p>
                </div>
            </div>
        {/each}
    </div>
{:catch error}
    <p>An error occurred!</p>
{/await}


