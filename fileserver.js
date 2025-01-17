document.addEventListener('DOMContentLoaded', function() {
    const breadcrumb = document.getElementById('breadcrumb');
    const fileExplorer = document.querySelector('table');
    const apiBase = 'https://api.github.com/repos/wpetersen-hypercraft/wpetersen-hypercraft.github.io/contents';
    const rootPath = 'contents';

    function getPathFromUrl() {
        let path = window.location.pathname.split('/').filter(Boolean);
        if (path[0] !== rootPath) {
            path.unshift(rootPath);
        }
        return path.join('/');
    }

    function updateBreadcrumb(path) {
        let parts = path.split('/').filter(Boolean);
        let html = `<a href="/${rootPath}">Home</a>`;
        let currentPath = `/${rootPath}`;
        parts.forEach((part, index) => {
            if (index > 0) {
                currentPath += '/' + part;
                html += ` / <a href="${currentPath}">${decodeURIComponent(part)}</a>`;
            }
        });
        breadcrumb.innerHTML = html;
    }

    function fetchFiles(path) {
        updateBreadcrumb(path);
        const apiPath = '/' + path;
        const fullApiUrl = apiBase + apiPath;
        console.log('Fetching files from URL:', fullApiUrl);
        
        fetch(fullApiUrl)
            .then(response => {
                console.log('API Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received data:', data);
                if (Array.isArray(data)) {
                    data.sort((a, b) => {
                        if (a.type !== b.type) {
                            return a.type === 'dir' ? -1 : 1;
                        }
                        return a.name.localeCompare(b.name);
                    });

                    let tableHtml = `
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Date</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;

                    data.forEach(item => {
                        let itemPath = `/${path}/${item.name}`.replace(/\/+/g, '/');
                        let dateString = getStoredDate(item) || 'Not available';
                        tableHtml += `
                            <tr>
                                <td>${item.type === 'dir' ? '📁' : '📄'} <a href="${itemPath}">${decodeURIComponent(item.name)}</a></td>
                                <td>${dateString}</td>
                                <td>${item.size ? `${(item.size / 1024).toFixed(2)} KB` : '-'}</td>
                            </tr>
                        `;
                    });

                    tableHtml += '</tbody>';
                    fileExplorer.innerHTML = tableHtml;

                    // Update dates in the background
                    updateDates(data, path);
                } else if (data.type === 'file') {
                    console.log('Redirecting to raw content:', data.download_url);
                    window.location.href = data.download_url;
                } else {
                    throw new Error('Unexpected data format received from API');
                }
            })
            .catch(error => {
                console.error('Error in fetchFiles:', error);
                fileExplorer.innerHTML = `<tr><td colspan="3">Error loading content: ${error.message}. Please check the console for more details and try again.</td></tr>`;
            });
    }

    function getStoredDate(item) {
        const key = `${item.path}:${item.size}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const { date, timestamp } = JSON.parse(stored);
            // Check if the stored date is less than a day old
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                return new Date(date).toLocaleString();
            }
        }
        return null;
    }

    function updateDates(items, path) {
        items.forEach(item => {
            const key = `${item.path}:${item.size}`;
            if (!getStoredDate(item)) {
                // Simulate a date for demonstration purposes
                // In a real scenario, you'd fetch this from the server
                const simulatedDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
                localStorage.setItem(key, JSON.stringify({
                    date: simulatedDate.toISOString(),
                    timestamp: Date.now()
                }));
                
                // Update the UI
                let itemPath = `/${path}/${item.name}`.replace(/\/+/g, '/');
                const row = fileExplorer.querySelector(`a[href="${itemPath}"]`).closest('tr');
                if (row) {
                    row.cells[1].textContent = simulatedDate.toLocaleString();
                }
            }
        });
    }

    function handleNavigation(path) {
        path = path.replace(/^\/+|\/+$/g, '');
        let parts = path.split('/').filter(Boolean);
        
        if (parts[0] !== rootPath) {
            parts.unshift(rootPath);
        }
        
        path = '/' + parts.join('/');
        console.log('Navigating to:', path);
        
        history.pushState(null, '', path);
        fetchFiles(parts.join('/'));
    }

    window.onpopstate = function(event) {
        handleNavigation(getPathFromUrl());
    };

    document.addEventListener('click', function(event) {
        if (event.target.tagName === 'A' && event.target.getAttribute('href').startsWith('/')) {
            event.preventDefault();
            handleNavigation(event.target.getAttribute('href'));
        }
    });

    // Initial load
    if (window.location.pathname === '/' || window.location.pathname === '') {
        handleNavigation(`/${rootPath}`);
    } else {
        handleNavigation(getPathFromUrl());
    }
});