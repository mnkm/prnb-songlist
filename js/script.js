$(function () {
    const TALENT_COLORS = {
        nina: '#fff0f3',
        yura: '#ebf8ff',
        ren: '#fff2da',
        hinata: '#ebf8e2',
        ruka: '#d0ccff'
    };
    const TALENT_COLORS_DARK = {
        nina: '#9a3f5b',
        yura: '#2f7f9f',
        ren: '#a17a25',
        hinata: '#4e743e',
        ruka: '#5f5793'
    };

    // テーマはシステム設定を初期値とし、手動選択後は同一セッション内で優先する。
    const themeToggle = document.querySelector('#themeToggle');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    const THEME_STORAGE_KEY = 'songlist-theme';

    function updateThemeSwitcherPosition() {
        const title = document.querySelector('.page-title');
        const switcher = document.querySelector('.theme-switcher');
        if (!title || !switcher) {
            return;
        }

        const titleBottom = title.getBoundingClientRect().bottom;
        switcher.style.top = `${Math.max(0, titleBottom - switcher.offsetHeight)}px`;
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

        const color = isDarkMode() ? '#edf4ff' : '#09244BFF';
        favicon.setAttribute('href', buildPlaylistIconSvg(color));
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        themeToggle.checked = theme === 'dark';
        updateFavicon();
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        applyTheme(savedTheme || (systemDarkMode.matches ? 'dark' : 'light'));
    }

    initializeTheme();
    updateThemeSwitcherPosition();
    window.addEventListener('resize', updateThemeSwitcherPosition);
    if (document.fonts) {
        document.fonts.ready.then(updateThemeSwitcherPosition);
    }
    themeToggle.addEventListener('change', function () {
        const theme = this.checked ? 'dark' : 'light';
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        applyTheme(theme);
        applyAccentColor($('#talentFilter').val());
    });

    function applyAccentColor(talent) {
        // テーマに応じた色を選び、CSS側の各コンポーネントへ一括反映する。
        const colors = isDarkMode()
            ? TALENT_COLORS_DARK
            : TALENT_COLORS;
        const color = colors[talent] || '#337ab7';
        document.documentElement.style.setProperty('--accent-color', color);
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
        const pageLengthControlsHeight = tableArea.find('.page-length-controls').outerHeight(true) || 0;
        if (!wrapper.length) {
            return Math.max(50, tableArea.innerHeight() - pageLengthControlsHeight - 100);
        }

        const lengthHeight = wrapper.find('.dataTables_length').outerHeight(true) || 0;
        const scrollHeadHeight = wrapper.find('.dataTables_scrollHead').outerHeight(true) || 0;
        const infoHeight = wrapper.find('.dataTables_info').outerHeight(true) || 0;
        const pagerHeight = wrapper.find('.dataTables_paginate').outerHeight(true) || 0;
        const controlsHeight = pageLengthControlsHeight + lengthHeight + scrollHeadHeight + infoHeight + pagerHeight;

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

    const AVAILABLE_TALENTS = ['nina', 'yura', 'ren', 'hinata', 'ruka'];
    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');

    function updateFilterPanelTitles() {
        const talentCollapsed = !$('#talentFilterPanel').hasClass('in');
        const detailCollapsed = !$('#detailFilterPanel').hasClass('in');
        const textCollapsed = !$('#textFilterPanel').hasClass('in');
        const talentName = $('#talentFilter option:selected').text();
        const hasFilter = $('#genreFilter').val() || $('#artistFilter').val() || $('#typeFilter').val();
        const hasKeyword = $('#textFilter').val();

        $('#talentPanelTitle').text(
            talentCollapsed ? `タレント：${talentName}` : 'タレント'
        );
        $('#detailPanelTitle').text(
            detailCollapsed && hasFilter ? 'フィルタ：設定中' : 'フィルタ'
        );
        $('#textPanelTitle').text(
            textCollapsed && hasKeyword ? 'キーワード：設定中' : 'キーワード'
        );
    }

    function resetFilters() {
        // セレクト初期化
        $('#genreFilter').val('');
        $('#artistFilter').val('');
        $('#typeFilter').val('');
        $('#textFilter').val('');

        if (table) {
            table.search('');
            table.columns().search('');
            table.draw();
        }
    }
    function updateUrlTalent(talent) {
        const url = new URL(window.location);
        url.searchParams.set('talent', talent);
        url.searchParams.keys().forEach(key => {
            if (key !== 'talent'){
                url.searchParams.delete(key);
            }
        })

        history.replaceState(null, '', url);
    }

    $('#talentFilter').on('change', function () {
        const talent = this.value;
        updateUrlTalent(talent);
        applyAccentColor(talent);
        updateFilterPanelTitles();
        loadTable(talent);
    });

    $('#grid').on('click', 'tbody tr', function () {
        if (!table) {
            return;
        }

        const row = table.row(this).data();
        if (!row) {
            return;
        }

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
            showToast('クリップボードへのコピーに失敗しました', 'error');
            return;
        }

        const text = `${row.title} / ${row.artist}`;
        navigator.clipboard.writeText(text)
            .then(function () {
                showToast(`コピーしました: ${text}`, 'success');
            })
            .catch(function () {
                showToast('クリップボードへのコピーに失敗しました', 'error');
            });
    });

    function rebuildFilters(rows) {
        // ジャンル再生成
        const genres = [...new Set(rows.map(r => r.genre).filter(Boolean))].sort();
        $('#genreFilter').empty().append('<option value="">すべて</option>');
        genres.forEach(g => {
            $('#genreFilter').append(`<option value="${g}">${g}</option>`);
        });

        // アーティスト再生成
        const artists = [...new Set(rows.map(r => r.artist).filter(Boolean))].sort();
        $('#artistFilter').empty().append('<option value="">すべて</option>');
        artists.forEach(a => {
            $('#artistFilter').append(`<option value="${a}">${a}</option>`);
        });

        // 種類再生成
        const types = [...new Set(rows.map(r => r.type).filter(Boolean))].sort();
        $('#typeFilter').empty().append('<option value="">すべて</option>');
        types.forEach(a => {
            $('#typeFilter').append(`<option value="${a}">${a}</option>`);
        });
    }

    function applyFilters() {
        const genre = $('#genreFilter').val();
        const artist = $('#artistFilter').val();
        const type = $('#typeFilter').val();
        const text = $('#textFilter').val();

        table.column(1).search(
            artist ? '^' + $.fn.dataTable.util.escapeRegex(artist) + '$' : '',
            true,
            false
        );
        
        table.column(2).search(
            genre ? '^' + $.fn.dataTable.util.escapeRegex(genre) + '$' : '',
            true,
            false
        );

        table.column(3).search(
            type ? '^' + $.fn.dataTable.util.escapeRegex(type) + '$' : '',
            true,
            false
        );

        table.search(text).draw();
    }

    function updateResponsiveColumns() {
        if (!table) {
            return;
        }

        table.column(2).visible(!mobileMediaQuery.matches, false);
        table.columns.adjust();
    }

    function setInitialFilterPanelState() {
        $('#talentFilterPanel').collapse('show');
        $('#detailFilterPanel, #textFilterPanel').collapse(
            mobileMediaQuery.matches ? 'hide' : 'show'
        );
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

    function loadTable(talent, type) {
        applyAccentColor(talent);
        showLoading();

        $.getJSON(
            "https://script.google.com/macros/s/AKfycbwT3lwAbGUwws3WGFdRjrrRVlxNAydG6WuWcpDHGy6QNEk3t5IU-P4flXxWXgXey6se/exec",
            { talent: talent }
        )
            .done(
                function (res) {

                    // フィルタ初期化（重要）
                    resetFilters();

                    // DataTable を変数に保持
                    if (!table) {
                        table = $('#grid').DataTable({
                            data: res.rows,
                            dom: 'rtip',
                            pageLength: 10,
                            scrollY: calcTableHeight() + 'px',
                            scrollCollapse: true,
                            columns: [
                                { data: 'title', title: '楽曲' },
                                { data: 'artist', title: 'アーティスト' },
                                { data: 'genre', title: 'ジャンル' },

                                // 非表示だが検索対象
                                {
                                    data: 'type',
                                    visible: false,
                                    searchable: true
                                },
                                {
                                    data: 'reading',
                                    visible: false,
                                    searchable: true
                                },

                                // いまのところ不要
                                {
                                    data: 'content',
                                    visible: false,
                                    searchable: false
                                }
                            ],

                            searching: true,
                            paging: true,
                            ordering: true,

                            language: {
                                search: "",
                                searchPlaceholder: "キーワード検索",
                                info: "_TOTAL_ 件中 _START_〜_END_ 件",
                                paginate: {
                                    first: "最初",
                                    last: "最後",
                                    next: "次",
                                    previous: "前"
                                }
                            }
                        });
                        updatePageLengthButtons();
                        updateResponsiveColumns();
                        updateTableHeight();
                    } else {
                        table.clear();
                        table.rows.add(res.rows);
                        table.draw();
                        updateResponsiveColumns();
                        updateTableHeight();
                    }

                    // DataTablesが生成した検索ボックスを移動
                    $('#grid_filter').appendTo('#tableSearch');

                    // テキスト検索（全列対象）
                    $('#textFilter').on('input', function () {
                        table.search(this.value).draw();
                    });

                    // プルダウン再構築
                    rebuildFilters(res.rows);
                    updateFilterPanelTitles();

                    // 条件：type指定がrequestの場合
                    if (talent =='hinata' && type == 'request') {
                        $('#typeFilter').val('弾き語り');

                        // 初期フィルタ適用
                        applyFilters();
                    } else {
                        updateUrlTalent(talent);
                    }
                })
            .fail(function () {
                applyAccentColor(talent);
                alert('データの取得に失敗しました');
            })
            .always(function () {
                hideLoading();
            }
            );
    }

    $(function () {
        // URLパラメータから取得
        const urlTalent = getUrlParam('talent');
        const urlType = getUrlParam('type');

        // select の初期値決定
        const initialTalent = AVAILABLE_TALENTS.includes(urlTalent)
            ? urlTalent
            : $('#talentFilter').val(); // HTML側のデフォルト
        
        // select に反映
        $('#talentFilter').val(initialTalent);

        // スマートフォンではフィルタパネルを初期状態で折りたたむ
        setInitialFilterPanelState();

        // 初期表示
        applyAccentColor(initialTalent);
        loadTable($('#talentFilter').val(), urlType);

        // タレント変更時
        $('#talentFilter').on('change', function () {
            loadTable(this.value);
        });

        // フィルタ操作
        $('#genreFilter, #artistFilter, #typeFilter').on('change', applyFilters);
        $('#genreFilter, #artistFilter, #typeFilter').on('change', updateFilterPanelTitles);
        $('#textFilter').on('input', function () {
            applyFilters();
            updateFilterPanelTitles();
        });
        mobileMediaQuery.addEventListener('change', function () {
            updateFilterPanelTitles();
            updateResponsiveColumns();
            updateTableHeight();
        });
        $(window).on('resize', updateTableHeight);
        $('.filter-panel .panel-collapse').on('shown.bs.collapse hidden.bs.collapse', function () {
            updateFilterPanelTitles();
            updateTableHeight();
        });

    });
});
