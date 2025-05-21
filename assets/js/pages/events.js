document.addEventListener('DOMContentLoaded', async () => {
    const eventsSection = document.getElementById('eventsSection');
    const today = new Date().toISOString().split('T')[0];

    async function fetchEvents() {
        try {
            const res = await fetch('http://localhost:3000/events');
            if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
            const events = await res.json();

            // Filter
            const futureEvents = events.filter(event => new Date(event.date) >= new Date(today));

            eventsSection.innerHTML = futureEvents.length === 0 
                ? '<p class="text-center text-danger">No upcoming events found.</p>'
                : futureEvents.map(event => `
                    <div class="event-card">
                        <div class="event-details">
                            <div class="event-meta">
                                <span><i class="fa-solid fa-calendar-days"></i> ${new Date(event.date).toLocaleDateString('en-GB')}</span>
                                <span><i class="fa-solid fa-location-dot"></i> ${event.location || 'N/A'}</span>
                            </div>
                            <h3 class="event-title">${event.title}</h3>
                            <p class="event-description">${event.description}</p>
                            <div class="organizer">
                                <img class="organizer-img" src="${event.organizerImage}" alt="${event.organizerName || 'Organizer'}">
                                <p class="organizer-name">Organized By: <span>${event.organizerName || 'Unknown'}</span></p>
                            </div>
                        </div>
                        <div class="event-image ${event.imageClass || 'event-image-1'}">
                            <span class="event-badge">${event.isFree ? 'Free' : 'Paid'}</span>
                        </div>
                    </div>
                `).join('');
        } catch (error) {
            console.error('Error:', error.message);
            eventsSection.innerHTML = '<p class="text-center text-danger">Failed to load events.</p>';
        }
    }

    await fetchEvents();
});