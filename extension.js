export default {
  onload: () => {
  function baseUrl() {
    const url = new URL(window.location.href);
    const parts = url.hash.split('/');
    url.hash = parts.slice(0, 3).concat(['page']).join('/');
    return url;
}


function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}


function stripBrackets(s) {
    return s.replace(']]', '').replace('[[', '')
}


async function resolveBlockRefsInText(blockText) {
    let refs = blockText.match(/\(\(.+?\)\)/g);
    if (refs != null) {
        for (const e of refs) {
            let uid = e.replaceAll('(', '').replaceAll(')', '');
            let results = await getBlockInfoByUID(uid, false);
            if (results) blockText = blockText.replace(e, results[0][0].string);
        }
    }
    return blockText
}


function nthDate(d) {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
}


async function getBlockInfoByUID(uid, withChildren = false, withParents = false) {
    try {
        let q = `[:find (pull ?page
                     [:node/title :block/string :block/uid :block/heading :block/props 
                      :entity/attrs :block/open :block/text-align :children/view-type
                      :block/order
                      ${withChildren ? '{:block/children ...}' : ''}
                      ${withParents ? '{:block/parents ...}' : ''}
                     ])
                  :where [?page :block/uid "${uid}"]  ]`;
        var results = await window.roamAlphaAPI.q(q);
        if (results.length == 0) return null;
        return results;
    } catch (e) {
        return null;
    }
}


async function capturePageInfo() {
    let pageUID = '';
    let pageTitle = 'UNKNOWN';
    const href = window.location.href;
    if (href.includes('page')) {
        pageUID = href.replace(baseUrl().href + '/', '')
        const testForParents = await getBlockInfoByUID(pageUID, false, true);
        const blockData = testForParents[0][0];
        if (blockData.parents) {
            pageUID = blockData.parents[0].uid;
            pageTitle = blockData.parents[0].title;
        } else {
            pageTitle = blockData.title;
        }
    } else {
        try {
            const d = new Date();
            const year = d.getFullYear();
            const date = d.getDate();
            const month = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()];
            const nthStr = nthDate(date);
            pageTitle = `${month} ${date}${nthStr}, ${year}`;
            pageUID = await window.roamAlphaAPI.q(`[:find ?uid :where [?e :node/title "${pageTitle}"][?e :block/uid ?uid ] ]`)[0].toString();
        } catch (e) { }
    }

    pageTitle = stripBrackets(pageTitle);
    return { uid: pageUID, title: pageTitle };
}

async function capturePageHtml(pageInfo) {

    var head = document.querySelector('head').innerHTML
        .replaceAll('href="assets', 'href="http://roamresearch.com/assets')

    const body = document.querySelector('.rm-article-wrapper').innerHTML;

    pageInfo.html = '<html><head>' + head + "</head><body>" + body + "</body></html>";
    return pageInfo;
}

window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: 'Snapshot',
    callback: async function () {
        capturePageInfo()
            .then(capturePageHtml)
            .then(function (result) {
                download(result.title + '.html', result.html);
            })
    }
});
  },
  onunload: () => {}
};
