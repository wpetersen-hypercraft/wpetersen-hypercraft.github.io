document.addEventListener('DOMContentLoaded', function() {
    const breadcrumb = document.getElementById('breadcrumb');
    const fileExplorer = document.querySelector('table');
    const apiBase = 'https://api.github.com/repos/wpetersen-hypercraft/wpetersen-hypercraft.github.io/contents/';
    const rootPath = 'contents';

    function getPathFromUrl() {
        let path = window.location.pathname.split('/').filter(Boolean);
        if (path[0] === rootPath) {
            path.shift();
        }
        return path.join('/');
    }

    function updateBreadcrumb(path) {
        let html = '<a href="/">Home</a>';
        let currentPath = '';
        path.split('/').filter(Boolean).forEach((part) => {
            currentPath += '/' + part;
            html += ` / <a href="${currentPath}">${decodeURIComponent(part)}</a>`;
        });
        breadcrumb.innerHTML = html;
    }

    function fetchFiles(path = '') {
        updateBreadcrumb(path);
        fetch(apiBase + rootPath + '/' + path)
            .then(response => response.json())
            .then(data => {
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
                        tableHtml += `
                            <tr>
                                <td>${item.type === 'dir' ? '📁' : '📄'} <a href="/${item.path.replace(rootPath + '/', '')}">${decodeURIComponent(item.name)}</a></td>
                                <td>Loading...</td>
                                <td>${item.size ? `${(item.size / 1024).toFixed(2)} KB` : '-'}</td>
                            </tr>
                        `;
                    });

                    tableHtml += '</tbody>';
                    fileExplorer.innerHTML = tableHtml;

                    data.forEach(item => fetchItemDetails(item));
                } else {
                    // Single file, redirect to its raw content
                    window.location.href = data.download_url;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                fileExplorer.innerHTML = '<tr><td colspan="3">Error loading content. Please try again.</td></tr>';
            });
    }

    function fetchItemDetails(item) {
        fetch(`${apiBase}${item.path}?ref=main`)
            .then(response => response.json())
            .then(data => {
                const row = fileExplorer.querySelector(`a[href="/${item.path.replace(rootPath + '/', '')}"]`).closest('tr');
                row.cells[1].textContent = new Date(data.commit.committer.date).toLocaleString();
            })
            .catch(error => console.error('Error:', error));
    }

    function handleNavigation(path) {
        path = path.replace(/^\//, '').replace(new RegExp(`^${rootPath}\/`), '');
        history.pushState(null, '', '/' + path);
        fetchFiles(path);
    }

    window.onpopstate = function(event) {
        fetchFiles(getPathFromUrl());
    };

    document.addEventListener('click', function(event) {
        if (event.target.tagName === 'A' && event.target.getAttribute('href').startsWith('/')) {
            event.preventDefault();
            handleNavigation(event.target.getAttribute('href'));
        }
    });

    // Initial load
    fetchFiles(getPathFromUrl());
});