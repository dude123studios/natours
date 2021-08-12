export const displayMap = (locations) => {
    mapboxgl.accessToken =
        'pk.eyJ1IjoiZHVkZTEyM3N0dWRpb3MiLCJhIjoiY2tybWYwODFuN3RwNjJubDNneTA3Y2FxZCJ9.3ow6D5912TvP9Z9w9xn0yw';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/dude123studios/ckrmfeu7zb6zv18peevyv3ttr',
        scrollZoom: false,
    });
    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
        const el = document.createElement('div');
        el.className = 'marker';

        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        new mapboxgl.Popup({
            offset: 30,
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100,
        },
    });
};
