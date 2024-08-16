document.addEventListener('DOMContentLoaded', function() {
    const breadcrumb = document.getElementById('breadcrumb');
    const fileExplorer = document.querySelector('table');
    const apiBase = 'https://api.github.com/repos/wpetersen-hypercraft/wpetersen-hypercraft.github.io/contents/';
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
            if (index > 0) { // Skip the first 'contents' part
                currentPath += '/' + part;
                html += ` / <a href="${currentPath}">${decodeURIComponent(part)}</a>`;
            }
        });
        breadcrumb.innerHTML = html;
    }

    function fetchFiles(path) {
        updateBreadcrumb(path);
        const apiPath = path.replace(/^contents\//, ''); // Remove leading 'contents/' for API call
        fetch(apiBase + apiPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
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
                        let itemPath = `/${path}/${item.name}`.replace(/\/+/g, '/');
                        tableHtml += `
                            <tr>
                                <td>${item.type === 'dir' ? '📁' : '📄'} <a href="${itemPath}">${decodeURIComponent(item.name)}</a></td>
                                <td>Loading...</td>
                                <td>${item.size ? `${(item.size / 1024).toFixed(2)} KB` : '-'}</td>
                            </tr>
                        `;
                    });

                    tableHtml += '</tbody>';
                    fileExplorer.innerHTML = tableHtml;

                    data.forEach(item => fetchItemDetails(item, path));
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

    function fetchItemDetails(item, path) {
        const apiPath = `${path}/${item.name}`.replace(/^contents\//, '');
        fetch(`${apiBase}${apiPath}?ref=main`)
            .then(response => response.json())
            .then(data => {
                let itemPath = `/${path}/${item.name}`.replace(/\/+/g, '/');
                const row = fileExplorer.querySelector(`a[href="${itemPath}"]`).closest('tr');
                row.cells[1].textContent = new Date(data.commit.committer.date).toLocaleString();
            })
            .catch(error => console.error('Error:', error));
    }

    function handleNavigation(path) {
        // Remove leading and trailing slashes
        path = path.replace(/^\/+|\/+$/g, '');
        
        // Split the path into parts
        let parts = path.split('/').filter(Boolean);
        
        // Ensure 'contents' is the first part, but only once
        if (parts[0] !== rootPath) {
            parts.unshift(rootPath);
        }
        
        // Reconstruct the path
        path = '/' + parts.join('/');
        
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