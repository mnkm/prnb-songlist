$(function () {
    const TALENT_COLORS = {
        nina: '#fff0f3',
        yura: '#ebf8ff',
        ren: '#fff2da',
        hinata: '#ebf8e2',
        ruka: '#d0ccff'
    };

    function applyAccentColor(talent) {
        const color = TALENT_COLORS[talent] || '#337ab7';
        document.documentElement.style.setProperty('--accent-color', color);
    }
    function calcTableHeight() {
        const headerHeight = $('h3').outerHeight(true);
        const filterHeight = $('.filter-area').outerHeight(true);
        const padding = 315; // 余白調整
        return $(window).height() - headerHeight - filterHeight - padding;
    }

    function showLoading() {
        $('#loadingOverlay').show();
    }

    function hideLoading() {
        $('#loadingOverlay').hide();
    }
    let table = null;

    function getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    const AVAILABLE_TALENTS = ['nina', 'yura', 'ren', 'hinata', 'ruka'];

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
        url.searchParams.delete('type');
        history.replaceState(null, '', url);
    }

    $('#talentFilter').on('change', function () {
        const talent = this.value;
        updateUrlTalent(talent);
        applyAccentColor(talent);
        loadTable(talent);
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
                            dom: 'lrtip',
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
                                lengthMenu: "_MENU_ 件表示",
                                info: "_TOTAL_ 件中 _START_〜_END_ 件",
                                paginate: {
                                    first: "最初",
                                    last: "最後",
                                    next: "次",
                                    previous: "前"
                                }
                            }
                        });
                    } else {
                        table.clear();
                        table.rows.add(res.rows);
                        table.draw();
                    }

                    // DataTablesが生成した検索ボックスを移動
                    $('#grid_filter').appendTo('#tableSearch');

                    // テキスト検索（全列対象）
                    $('#textFilter').on('input', function () {
                        table.search(this.value).draw();
                    });

                    // プルダウン再構築
                    rebuildFilters(res.rows);

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

        // 初期表示
        applyAccentColor(initialTalent);
        loadTable($('#talentFilter').val(), urlType);

        // タレント変更時
        $('#talentFilter').on('change', function () {
            loadTable(this.value);
        });

        // フィルタ操作
        $('#genreFilter, #artistFilter, #typeFilter').on('change', applyFilters);
        $('#textFilter').on('input', applyFilters);

    });
});
