let adminPassword = null;

async function login() {
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            adminPassword = password;
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('resultsSection').classList.remove('hidden');
            errorMsg.classList.add('hidden');
            loadResults();
        } else {
            errorMsg.textContent = 'Onjuist wachtwoord!';
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.textContent = 'Kan geen verbinding maken met de server.';
        errorMsg.classList.remove('hidden');
    }
}

function logout() {
    adminPassword = null;
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

async function loadResults() {
    const container = document.getElementById('resultsTableContainer');

    let results = [];
    try {
        const response = await fetch('/api/results');
        if (!response.ok) throw new Error('Server fout');
        const data = await response.json();
        results = data.results || [];
    } catch (err) {
        container.innerHTML = '<p class="center">Fout bij laden van resultaten.</p>';
        return;
    }

    if (results.length === 0) {
        container.innerHTML = '<p class="center">Nog geen resultaten beschikbaar.</p>';
        return;
    }

    const sortedResults = results.slice().sort((a, b) => b.score - a.score);

    let html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th># Rank</th>
                    <th>Icoon</th>
                    <th>Naam</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Datum</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedResults.forEach((result, index) => {
        const percentage = Math.round((result.score / result.total) * 100);
        let rankEmoji = '';
        if (index === 0) rankEmoji = '🥇';
        else if (index === 1) rankEmoji = '🥈';
        else if (index === 2) rankEmoji = '🥉';
        else rankEmoji = `${index + 1}`;

        html += `
            <tr>
                <td>${rankEmoji}</td>
                <td><img src="${result.icon}" alt="icoon" style="width: 40px; height: 40px; border-radius: 50%;"></td>
                <td>${escapeHtml(result.name)}</td>
                <td>${result.score} / ${result.total}</td>
                <td>${percentage}%</td>
                <td>${escapeHtml(result.date)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function clearResults() {
    if (!confirm('Weet je zeker dat je alle resultaten wilt wissen? Dit kan niet ongedaan worden gemaakt.')) {
        return;
    }

    try {
        const response = await fetch('/api/results', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword })
        });
        if (!response.ok) throw new Error('Server fout');
    } catch (err) {
        alert('Kon resultaten niet wissen: ' + err.message);
        return;
    }

    loadResults();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});
