$(function () {
    // 楽曲データを返す GAS の Web アプリ(gas/ のソース)。デプロイを新しく作り直したときだけ変わる
    const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx61e698leQlyLWXTTND-YgOTfV2lNB1YBKLgtJfBAmUOL2XTq1A3uW2AnSIck0WCm-5Q/exec';
    // GAS が応答しないときに、読み込みをあきらめるまでの時間(ミリ秒)
    const LOAD_TIMEOUT = 20000;

    // タレントの色。soft は背景の塗り、strong は枠線・下線・選択中の印に使う(白地・黒地で読める濃さ)
    const TALENT_COLORS = {
        nina: { soft: '#fff0f3', strong: '#b0446a' },
        yura: { soft: '#ebf8ff', strong: '#2a6f99' },
        ren: { soft: '#fff2da', strong: '#8f6210' },
        hinata: { soft: '#ebf8e2', strong: '#3f7a2c' },
        ruka: { soft: '#d0ccff', strong: '#5b4fb0' }
    };
    const TALENT_COLORS_DARK = {
        nina: { soft: '#9a3f5b', strong: '#f08fb0' },
        yura: { soft: '#2f7f9f', strong: '#7cc4e6' },
        ren: { soft: '#a17a25', strong: '#e0b45a' },
        hinata: { soft: '#4e743e', strong: '#8fc979' },
        ruka: { soft: '#5f5793', strong: '#b1a6f5' }
    };

    // テーマはシステム設定を初期値とし、手動で選んだら、その選択をブラウザに保存して優先する。
    const themeToggle = document.querySelector('#themeToggle');
    const copyFormatInputs = document.querySelectorAll('input[name="copyFormat"]');
    const menuButton = document.getElementById('menuButton');
    const sideMenu = document.getElementById('sideMenu');
    const menuBackdrop = document.getElementById('menuBackdrop');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    const THEME_STORAGE_KEY = 'songlist-theme';
    const COPY_FORMAT_STORAGE_KEY = 'songlist-copy-format';
    const COPY_FORMAT_OPTIONS = ['titleArtist', 'titleOnly'];
    const DEFAULT_COPY_FORMAT = 'titleArtist';

    // localStorage は、プライベートブラウズやブラウザの設定で使えないと例外になる。
    // 使えなくてもページは動くよう、読み書きの失敗は無視する(保存されないだけ)
    function readStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // 保存できなくても、表示中の設定は切り替わる
        }
    }

    function isDarkMode() {
        return document.documentElement.dataset.theme === 'dark';
    }

    function buildPlaylistIconSvg(color) {
        const svg = `
            <svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'>
                <title>playlist_fill</title>
                <g id='playlist_fill' fill='none'>
                    <path d='M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.003-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z'/>
                    <path fill='${color}' d='m17.33 4.055 2.986.996a1 1 0 0 1-.632 1.898L18 6.387V17.5a3.5 3.5 0 1 1-2-3.163V5.014c0-.69.675-1.177 1.33-.959M8 17a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2zm2-6a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2zm3-6a1 1 0 0 1 .117 1.993L13 7H4a1 1 0 0 1-.117-1.993L4 5z'/>
                </g>
            </svg>
        `;

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    function updateFavicon() {
        const favicon = document.getElementById('siteFavicon');
        if (!favicon) {
            return;
        }

        const color = isDarkMode() ? '#EAF4FF' : '#0F2A4A';
        favicon.setAttribute('href', buildPlaylistIconSvg(color));
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        themeToggle.checked = theme === 'dark';
        updateFavicon();
    }

    function initializeTheme() {
        const savedTheme = readStorage(THEME_STORAGE_KEY);
        const theme = savedTheme === 'dark' || savedTheme === 'light'
            ? savedTheme
            : (systemDarkMode.matches ? 'dark' : 'light');
        applyTheme(theme);
    }

    initializeTheme();
    themeToggle.addEventListener('change', function () {
        const theme = this.checked ? 'dark' : 'light';
        writeStorage(THEME_STORAGE_KEY, theme);
        applyTheme(theme);
        applyAccentColor(currentTalent);
    });

    // 保存されていた値などを、コピー形式として使える値にそろえる(知らない値なら既定の形式)
    function validCopyFormat(value) {
        return COPY_FORMAT_OPTIONS.includes(value) ? value : DEFAULT_COPY_FORMAT;
    }

    function getSelectedCopyFormat() {
        const selected = document.querySelector('input[name="copyFormat"]:checked');
        return validCopyFormat(selected ? selected.value : readStorage(COPY_FORMAT_STORAGE_KEY));
    }

    function syncCopyFormatSelectionState() {
        copyFormatInputs.forEach(function (input) {
            const option = input.closest('.copy-format-option');
            if (!option) {
                return;
            }
            option.classList.toggle('is-selected', input.checked);
        });
    }

    // メニューを閉じているあいだは inert にして、Tab で中に入らないようにする。
    // 開いたらメニューの中へ、閉じたら開いたボタンへフォーカスを移す
    function setMenuOpen(isOpen) {
        if (!sideMenu || !menuBackdrop || !menuButton) {
            return;
        }

        const wasOpen = sideMenu.classList.contains('is-open');
        sideMenu.classList.toggle('is-open', isOpen);
        menuBackdrop.classList.toggle('is-visible', isOpen);
        sideMenu.setAttribute('aria-hidden', String(!isOpen));
        sideMenu.inert = !isOpen;
        menuButton.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('menu-open', isOpen);

        if (isOpen && !wasOpen) {
            closeMenuButton.focus();
        } else if (!isOpen && wasOpen) {
            menuButton.focus();
        }
    }

    menuButton.addEventListener('click', function () {
        setMenuOpen(true);
    });

    closeMenuButton.addEventListener('click', function () {
        setMenuOpen(false);
    });

    menuBackdrop.addEventListener('click', function () {
        setMenuOpen(false);
    });

    copyFormatInputs.forEach(function (input) {
        input.addEventListener('change', function () {
            if (this.checked) {
                writeStorage(COPY_FORMAT_STORAGE_KEY, this.value);
            }
            syncCopyFormatSelectionState();
        });
    });

    const copyFormatToSelect = document.querySelector(
        `input[name="copyFormat"][value="${validCopyFormat(readStorage(COPY_FORMAT_STORAGE_KEY))}"]`
    );
    if (copyFormatToSelect) {
        copyFormatToSelect.checked = true;
    }
    syncCopyFormatSelectionState();

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            setMenuOpen(false);
        }
    });

    function applyAccentColor(talent) {
        // テーマに応じた色を選び、CSS側の各コンポーネントへ一括反映する。
        const colors = (isDarkMode() ? TALENT_COLORS_DARK : TALENT_COLORS)[talent];
        if (!colors) {
            return;
        }
        document.documentElement.style.setProperty('--accent-color', colors.soft);
        document.documentElement.style.setProperty('--accent-strong', colors.strong);
    }

    function updateTableAreaHeight() {
        const tableArea = $('.table-area');
        const footer = $('.page-footer');
        if (!tableArea.length || !footer.length) {
            return;
        }

        const tableAreaTop = tableArea.offset().top;
        const footerHeight = footer.outerHeight(true);
        const availableHeight = Math.max(0, $(window).height() - tableAreaTop - footerHeight);
        tableArea.css({
            height: `${availableHeight}px`,
            maxHeight: `${availableHeight}px`
        });
    }

    function calcTableHeight() {
        // 外部コントロールとDataTablesの補助領域を除き、スクロール領域の高さを算出する。
        updateTableAreaHeight();
        const tableArea = $('.table-area');
        const wrapper = tableArea.find('.dataTables_wrapper');
        const toolbarHeight = tableArea.find('.table-toolbar').outerHeight(true) || 0;
        if (!wrapper.length) {
            return Math.max(50, tableArea.innerHeight() - toolbarHeight - 100);
        }

        const scrollHeadHeight = wrapper.find('.dataTables_scrollHead').outerHeight(true) || 0;
        const infoHeight = wrapper.find('.dataTables_info').outerHeight(true) || 0;
        const pagerHeight = wrapper.find('.dataTables_paginate').outerHeight(true) || 0;
        const controlsHeight = toolbarHeight + scrollHeadHeight + infoHeight + pagerHeight;

        return Math.max(0, tableArea.innerHeight() - controlsHeight);
    }

    function showLoading() {
        $('#loadingOverlay').show();
    }

    function hideLoading() {
        $('#loadingOverlay').hide();
    }

    let toastTimer = null;

    function showToast(message, type) {
        const $toast = $('#toast');
        clearTimeout(toastTimer);
        $toast
            .removeClass('is-success is-error')
            .addClass(`is-${type}`)
            .text(message)
            .addClass('is-visible');
        toastTimer = setTimeout(function () {
            $toast.removeClass('is-visible');
        }, 2500);
    }

    let table = null;

    function updatePageLengthButtons() {
        if (!table) {
            return;
        }

        const pageLength = table.page.len();
        $('.page-length-button').each(function () {
            const isActive = Number($(this).data('page-length')) === pageLength;
            $(this)
                .toggleClass('active', isActive)
                .attr('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    $('.page-length-button').on('click', function () {
        if (!table) {
            return;
        }

        table.page.len(Number($(this).data('page-length'))).draw();
        updatePageLengthButtons();
    });

    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    // 選べるタレントは、index.html のタレントのボタンから取る(タレントを足すときは index.html と GAS だけを直す)
    const AVAILABLE_TALENTS = $('.talent-button').map(function () {
        return $(this).data('talent');
    }).get();
    let currentTalent = AVAILABLE_TALENTS[0];

    function setTalentButtons(talent) {
        $('.talent-button').each(function () {
            $(this).attr('aria-pressed', $(this).data('talent') === talent ? 'true' : 'false');
        });
    }

    // 楽曲データとして扱う項目。sortKey は並べ替え用に、読みをひらがなにそろえたもの
    const ROW_FIELDS = ['title', 'artist', 'category', 'genre', 'type', 'reading'];
    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');

    // フィルタの id・対応データ項目・DataTables列番号をここで一元管理する。
    // （増減させる場合はこの配列だけ変更すればよい）
    const FILTER_DEFS = [
        { id: '#artistFilter', field: 'artist', column: 1 },
        { id: '#categoryFilter', field: 'category', column: 2 },
        { id: '#genreFilter', field: 'genre', column: 3 },
        { id: '#typeFilter', field: 'type', column: 4 }
    ];
    const FILTER_SELECTOR = FILTER_DEFS.map(f => f.id).join(', ');

    // 絞り込みやキーワードの設定に合わせて、「設定中」の印・消去ボタン・曲数を更新する
    function updateFilterState() {
        const hasFilter = FILTER_DEFS.some(f => $(f.id).val());
        const hasKeyword = Boolean($('#textFilter').val());

        $('#filterBadge').prop('hidden', !hasFilter);
        $('#clearTextButton').prop('hidden', !hasKeyword);
        $('#clearFiltersButton').prop('hidden', !hasFilter && !hasKeyword);
        updateSongCount();
    }

    function updateSongCount() {
        if (!table) {
            $('#songCount').text('');
            return;
        }

        const total = table.rows().count();
        const shown = table.rows({ search: 'applied' }).count();
        $('#songCount').text(shown === total ? `${total} 曲` : `${shown} / ${total} 曲`);
    }

    function resetFilters(keepKeyword) {
        FILTER_DEFS.forEach(f => $(f.id).val(''));
        if (!keepKeyword) {
            $('#textFilter').val('');
        }

        if (table) {
            table.search(keepKeyword ? $('#textFilter').val() : '');
            table.columns().search('');
            table.draw();
        }
    }

    // URL のクエリを「?talent=<id>」だけにする(type=request などは、最初の表示にだけ使う)
    function updateUrlTalent(talent) {
        const url = new URL(window.location);
        url.search = new URLSearchParams({ talent: talent }).toString();
        history.replaceState(null, '', url);
    }

    $('.talent-button').on('click', function () {
        const talent = $(this).data('talent');
        if (talent === currentTalent && !$('.table-area').hasClass('has-error')) {
            return;
        }
        updateUrlTalent(talent);
        loadTable(talent);
    });

    function copyRow(rowElement) {
        if (!table) {
            return;
        }

        const row = table.row(rowElement).data();
        if (!row) {
            return;
        }

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            showToast('クリップボードへのコピーに失敗しました', 'error');
            return;
        }

        const format = getSelectedCopyFormat();
        const text = format === 'titleOnly'
            ? row.title
            : `${row.title} / ${row.artist}`;
        navigator.clipboard.writeText(text)
            .then(function () {
                showToast(`コピーしました: ${text}`, 'success');
            })
            .catch(function () {
                showToast('クリップボードへのコピーに失敗しました', 'error');
            });
    }

    $('#grid').on('click', 'tbody tr', function () {
        copyRow(this);
    });

    // 行にフォーカスがあるときは、Enter キーでもコピーする
    $('#grid').on('keydown', 'tbody tr', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            copyRow(this);
        }
    });

    // 選択肢を作り直す。値が 1 つもない項目は、選べないので隠す
    function rebuildFilters(rows) {
        FILTER_DEFS.forEach(f => {
            const values = [...new Set(rows.map(r => r[f.field]).filter(Boolean))].sort();
            const $select = $(f.id).empty().append('<option value="">すべて</option>');
            values.forEach(v => {
                $select.append($('<option>').val(v).text(v));
            });
            $select.closest('.filter-item').prop('hidden', values.length === 0);
        });
    }

    function applyFilters() {
        FILTER_DEFS.forEach(f => {
            const value = $(f.id).val();
            table.column(f.column).search(
                value ? '^' + $.fn.dataTable.util.escapeRegex(value) + '$' : '',
                true,
                false
            );
        });

        table.search($('#textFilter').val()).draw();
    }

    // スマートフォンの幅では、アーティストとカテゴリの列を隠し、曲名の下に小さく出す
    function updateResponsiveColumns() {
        if (!table) {
            return;
        }

        const isMobile = mobileMediaQuery.matches;
        table.column(1).visible(!isMobile, false);
        table.column(2).visible(!isMobile, false);
        table.rows().invalidate('data');
        table.draw(false);
        table.columns.adjust();
    }

    function setInitialFilterPanelState() {
        const isOpen = !mobileMediaQuery.matches;
        $('#filterArea').toggleClass('in', isOpen);
        $('#filterToggle')
            .toggleClass('collapsed', !isOpen)
            .attr('aria-expanded', String(isOpen));
    }

    function updateTableHeight() {
        if (!table) {
            return;
        }

        updateTableAreaHeight();
        const height = calcTableHeight();
        const scrollHeadHeight = $('.dataTables_scrollHead').outerHeight(true) || 0;
        const scrollHeight = Math.max(0, height + scrollHeadHeight);
        table.settings()[0].oScroll.sY = `${height}px`;
        $('.dataTables_scroll')
            .css('height', 'auto')
            .css('max-height', `${scrollHeight}px`);
        $('.dataTables_scrollBody')
            .css('height', 'auto')
            .css('max-height', `${height}px`);
        table.columns.adjust();
    }

    // カタカナをひらがなにそろえる(読みにはひらがなとカタカナが混ざっているため)
    function toHiragana(text) {
        return text.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    }

    // 表示に使う項目だけを取り出し、すべて文字列に揃える
    // (render.text() は文字列以外をエスケープしないため)
    function normalizeRows(rows) {
        if (!Array.isArray(rows)) {
            return [];
        }

        return rows.map(row => {
            const normalized = {};
            ROW_FIELDS.forEach(field => {
                const value = row ? row[field] : null;
                normalized[field] = value == null ? '' : String(value);
            });
            normalized.sortKey = toHiragana(normalized.reading || normalized.title).toLowerCase();
            return normalized;
        });
    }

    // DataTables の列。どの列も、外部データ(スプレッドシートのテキスト)を HTML エスケープして描く
    const escapeText = $.fn.dataTable.render.text().display;

    function textColumn(data, options) {
        return Object.assign({ data: data, render: $.fn.dataTable.render.text() }, options);
    }

    // 曲名の列。スマートフォンの幅では、アーティストとカテゴリを 2 行目に出す
    function renderTitle(data, type, row) {
        if (type !== 'display') {
            return data;
        }
        const title = escapeText(data);
        if (!mobileMediaQuery.matches) {
            return title;
        }
        const sub = [row.artist, row.category].filter(Boolean).map(escapeText).join(' · ');
        return sub ? `${title}<span class="song-sub">${sub}</span>` : title;
    }

    // 表の中身を rows に入れ替える(最初の 1 回は DataTable を作る)
    function showRows(rows) {
        if (!table) {
            table = $('#grid').DataTable({
                data: rows,
                dom: 'rtip',
                pageLength: 10,
                scrollY: calcTableHeight() + 'px',
                scrollCollapse: true,
                autoWidth: false,
                // 曲名は読みの五十音順に並べる
                order: [[0, 'asc']],
                columns: [
                    { data: 'title', title: '楽曲', render: renderTitle, orderData: [6] },
                    textColumn('artist', { title: 'アーティスト' }),
                    textColumn('category', { title: 'カテゴリ' }),

                    // 非表示だが検索対象
                    textColumn('genre', { visible: false, searchable: true }),
                    textColumn('type', { visible: false, searchable: true }),
                    textColumn('reading', { visible: false, searchable: true }),

                    // 並べ替えだけに使う
                    { data: 'sortKey', visible: false, searchable: false }
                ],

                // 行に Tab キーで移れるようにする
                createdRow: function (row) {
                    row.setAttribute('tabindex', '0');
                },

                searching: true,
                paging: true,
                ordering: true,

                language: {
                    search: "",
                    searchPlaceholder: "キーワード検索",
                    info: "_TOTAL_ 件中 _START_〜_END_ 件",
                    // 絞り込んだとき・0 件のときの文も日本語にする(指定しないと英語の既定の文が出る)
                    infoFiltered: "（全 _MAX_ 件から絞り込み）",
                    infoEmpty: "0 件",
                    zeroRecords: "一致する楽曲はありません",
                    emptyTable: "楽曲がありません",
                    paginate: {
                        first: "最初",
                        last: "最後",
                        next: "次",
                        previous: "前"
                    }
                }
            });
            table.on('draw', updateSongCount);
            updatePageLengthButtons();
        } else {
            table.clear();
            table.rows.add(rows);
            table.draw();
        }
        updateResponsiveColumns();
        updateTableHeight();
    }

    function showLoadError(isError) {
        $('.table-area').toggleClass('has-error', isError);
        $('#loadError').prop('hidden', !isError);
        if (isError) {
            $('#songCount').text('');
        }
    }

    $('#retryButton').on('click', function () {
        loadTable(currentTalent);
    });

    // 何回目の読み込みか。タレントを続けて切り替えたとき、前のタレントの遅れて届いた応答で上書きしないために使う
    let loadSeq = 0;

    function loadTable(talent, type) {
        const seq = ++loadSeq;
        currentTalent = talent;
        setTalentButtons(talent);
        applyAccentColor(talent);
        showLoading();

        // 読み込めなかったときは、前のタレントの曲が選んだタレントの曲に見えないよう、表を空にして知らせる
        const failed = function () {
            resetFilters(true);
            showRows([]);
            rebuildFilters([]);
            showLoadError(true);
            updateFilterState();
        };

        $.ajax({ url: GAS_ENDPOINT, data: { talent: talent }, dataType: 'json', timeout: LOAD_TIMEOUT })
            .done(function (res) {
                if (seq !== loadSeq) {
                    return;
                }

                // GAS側でエラーになった場合
                if (res.error) {
                    failed();
                    return;
                }

                const rows = normalizeRows(res.rows);
                showLoadError(false);

                // 絞り込みは選択肢がタレントごとに違うので戻す。キーワードは残す
                resetFilters(true);
                showRows(rows);

                // プルダウン再構築
                rebuildFilters(rows);

                // 条件：type指定がrequestの場合
                if (talent === 'hinata' && type === 'request') {
                    $('#typeFilter').val('弾き語り');
                } else {
                    updateUrlTalent(talent);
                }
                applyFilters();
                updateFilterState();
                updateTableHeight();
            })
            .fail(function () {
                if (seq === loadSeq) {
                    failed();
                }
            })
            .always(function () {
                if (seq === loadSeq) {
                    hideLoading();
                }
            });
    }

    // URLパラメータから取得
    const urlTalent = getUrlParam('talent');
    const urlType = getUrlParam('type');

    // 最初に表示するタレント(知らない値なら先頭のタレント)
    const initialTalent = AVAILABLE_TALENTS.includes(urlTalent)
        ? urlTalent
        : AVAILABLE_TALENTS[0];

    // スマートフォンでは絞り込みの欄を初期状態で折りたたむ
    setInitialFilterPanelState();

    // 初期表示
    loadTable(initialTalent, urlType);

    // 絞り込みとキーワードの操作
    $(FILTER_SELECTOR).on('change', function () {
        applyFilters();
        updateFilterState();
    });
    $('#textFilter').on('input', function () {
        applyFilters();
        updateFilterState();
    });
    $('#clearTextButton').on('click', function () {
        $('#textFilter').val('').trigger('focus');
        applyFilters();
        updateFilterState();
    });
    // 条件をすべて消す。リクエスト用の URL で開いていても、URL を ?talent= だけにする
    $('#clearFiltersButton').on('click', function () {
        resetFilters(false);
        updateUrlTalent(currentTalent);
        updateFilterState();
        $('#textFilter').trigger('focus');
    });

    mobileMediaQuery.addEventListener('change', function () {
        updateResponsiveColumns();
        updateTableHeight();
    });
    $(window).on('resize', updateTableHeight);
    $('#filterArea').on('shown.bs.collapse hidden.bs.collapse', updateTableHeight);
});
