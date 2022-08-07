function getQueryParams(query = null) {
    if (query || window.location.search.includes('?')) {
        let queries = [];
        let a = [];
        let b = [];

        a = query || window.location.search.split('?')[1];
        b = a.split('&');
        b.forEach((b_element) => {
            queries[b_element.split('=')[0]] = b_element.split('=')[1];
        })
        return queries;
    }
    else {
        return 0;
    }
}

export { getQueryParams };