(function() {
    "use strict";
    
    IDRViewerController.initialize_toolbar = function(base_path) {
        var Button = {},
            pgCount,
            curPg;

        /**
         * Shorthand helper function to getElementById
         * @param id
         * @returns {Element}
         */
        var d = function (id) {
            return document.getElementById(id);
        };

        var ClassHelper = (function() {
            return {
                addClass: function(ele, name) {
                    var classes = ele.className.length !== 0 ? ele.className.split(" ") : [];
                    var index = classes.indexOf(name);
                    if (index === -1) {
                        classes.push(name);
                        ele.className = classes.join(" ");
                    }
                },

                removeClass: function(ele, name) {
                    var classes = ele.className.length !== 0 ? ele.className.split(" ") : [];
                    var index = classes.indexOf(name);
                    if (index !== -1) {
                        classes.splice(index, 1);
                    }
                    ele.className = classes.join(" ");
                },

                toggleClass: function(ele, name) {
                    var classes = ele.className.length !== 0 ? ele.className.split(" ") : [];
                    var index = classes.indexOf(name);
                    var wasClassAdded;
                    if (index === -1) {
                        classes.push(name);
                        wasClassAdded = true;
                    } else {
                        classes.splice(index, 1);
                        wasClassAdded = false;
                    }
                    ele.className = classes.join(" ");
                    return wasClassAdded;
                }
            };
        })();

        /**
         * Encapsulation of sidebar functionality
         */
        var Sidebar = (function () {

            var Sidebar = {},
                loadedThumbsArray = [],
                lastScroll = 0,
                sidebar,
                thumbnailBar,
                imageType,
                scrollSidebar = true,
                thumbnailPanel,
                bookmarkPanel,
                searchPanel,
                isSearchLoaded,
                searchInput;

            /**
             * Performs the setup for the sidebar
             * @param bounds Page bounds array
             * @param thumbnailType Image type used for thumbnails
             * @param bookmarks Object containing any bookmarks
             */
            Sidebar.setup = function (bounds, thumbnailType, bookmarks) {

                Button.outlines = d('btnOutlines');
                Button.thumbnails = d('btnThumbnails');
                Button.search = d('btnSearch');
                d('btnSideToggle').onclick = function () {
                    Sidebar.toggleSidebar();
                };
                Button.outlines.onclick = function () {
                    Sidebar.switchToBookmarks();
                };
                Button.thumbnails.onclick = function () {
                    Sidebar.switchToThumbnails();
                };
                Button.search.onclick = function () {
                    Sidebar.switchToSearch();
                };

                thumbnailBar = d('leftContent');
                sidebar = d('left');
                thumbnailPanel = d('thumbnailPanel');
                bookmarkPanel = d('outlinePanel');
                searchPanel = d('searchPanel');
                searchInput = d('searchInput');
                imageType = thumbnailType;

                loadThumbnailFrames(bounds);
                // Initialise loaded array
                for (var i = 0; i < pgCount; i++) {
                    loadedThumbsArray[i] = false;
                }

                Sidebar.switchToThumbnails();

                thumbnailBar.addEventListener("scroll", handleThumbnailBarScroll);

                if (bookmarks.length > 0) {
                    Sidebar.setBookmarks(bookmarks);
                }
            };

            Sidebar.openSidebar = function() {
                if (sidebar.className.indexOf("open") === -1) {
                    Sidebar.toggleSidebar();
                }
            };

            /**
             * Toggle the sidebar open and closed
             */
            Sidebar.toggleSidebar = function () {
                if (ClassHelper.toggleClass(sidebar, "open")) {
                    loadVisibleThumbnails();
                }
            };

            /**
             * Display the thumbnail panel in the sidebar
             */
            Sidebar.switchToThumbnails = function () {
                thumbnailPanel.className = "visible";
                bookmarkPanel.className = "hidden";
                searchPanel.className = "hidden";
                Sidebar.scrollToPage(curPg);
                Button.thumbnails.className = 'disabled btn';
                Button.outlines.className = 'btn';
                Button.search.className = 'btn';
            };

            /**
             * Display the bookmarks panel in the sidebar
             */
            Sidebar.switchToBookmarks = function () {
                thumbnailPanel.className = "hidden";
                bookmarkPanel.className = "visible";
                searchPanel.className = "hidden";
                Button.thumbnails.className = 'btn';
                Button.outlines.className = 'disabled btn';
                Button.search.className = 'btn';
            };

            Sidebar.switchToSearch = function() {
                thumbnailPanel.className = "hidden";
                bookmarkPanel.className = "hidden";
                searchPanel.className = "visible";
                Button.thumbnails.className = 'btn';
                Button.outlines.className = 'btn';
                Button.search.className = 'disabled btn';

                var loadListener = function(loaded) {
                    if (loaded) {
                        searchInput.value = "";
                        searchInput.disabled = "";
                        searchInput.focus();
                    } else {
                        searchInput.value = "Search not available.";
                    }
                };
                var progressListener = function(percentageLoaded) {
                    searchInput.value = "Loading (" + percentageLoaded + "%)";
                };
                if (!isSearchLoaded) {
                    IDRViewer.loadSearch(loadListener, progressListener);
                }
                searchInput.focus();
            };

            /**
             * Load the frames for all the thumbnails
             * @param bounds Page bound array
             */
            var loadThumbnailFrames = function (bounds) {
                var heights = [];
                var MAXWIDTH = 160;
                var MAXHEIGHT = 200;
                // Calculate height for max width of 160px and max height of 200px
                for (var i = 0; i < bounds.length; i++) {
                    var height = Math.floor(bounds[i][1] * (MAXWIDTH / bounds[i][0]));
                    heights[i] = (bounds[i][0] > bounds[i][1] || height <= MAXHEIGHT) ? height : MAXHEIGHT;
                }

                function makeThumbnailClickHandler(pg) {
                    return function() {
                        scrollSidebar = false;
                        IDRViewer.goToPage(pg);
                        return false;
                    };
                }

                for (var page = 1; page <= bounds.length; page++) {
                    var ele = document.createElement("a");
                    ele.style.height = heights[page - 1] + "px";
                    ele.className = "thumbnail";
                    ele.href = "?page=" + page;
                    ele.id = "thumb" + page;
                    ele.onclick = makeThumbnailClickHandler(page);
                    ele.setAttribute('title', 'Page ' + page);
                    ele.innerHTML = '<img src="' + base_path + 'assets/loading.gif"/>';
                    thumbnailPanel.appendChild(ele);
                }
            };

            var handleThumbnailBarScroll = function () {
                var scrollTop = thumbnailBar.scrollTop;
                lastScroll = scrollTop;
                setTimeout(function () {
                    loadVisibleThumbnails(scrollTop);
                }, 500);
            };

            var loadVisibleThumbnails = function (scrollTop) {
                if (typeof scrollTop !== 'undefined' && scrollTop != lastScroll)
                    return;

                // load thumbs in view
                for (var thumbIndex = 0; thumbIndex < pgCount; thumbIndex++) {
                    if (!loadedThumbsArray[thumbIndex]) {
                        var curThumb = thumbnailPanel.children[thumbIndex];
                        // Bails out of the loop when the next thumbnail is below the viewable area
                        if (curThumb.offsetTop > thumbnailBar.scrollTop + thumbnailBar.clientHeight) {
                            break;
                        }
                        if (curThumb.offsetTop + curThumb.clientHeight > thumbnailBar.scrollTop) {
                            curThumb.children[0].setAttribute("src", base_path + "thumbnails/" + (thumbIndex + 1) + '.' + imageType);
                            loadedThumbsArray[thumbIndex] = true;
                        }
                    }
                }
            };

            /**
             * Scrolls the thumbnail bar to a specific page and adds currentPageThumbnail class.
             * @param page Page to scroll to
             * @param page2 Optional second page
             */
            Sidebar.scrollToPage = function (page, page2) {
                var curThumb = thumbnailPanel.children[page - 1];
                if (curThumb.className != "thumbnail currentPageThumbnail") {

                    for (var i = 0; i < pgCount; i++) {
                        thumbnailPanel.children[i].className = "thumbnail";
                    }

                    curThumb.className = "thumbnail currentPageThumbnail";

                    if (scrollSidebar) {
                        thumbnailBar.scrollTop = thumbnailBar.scrollTop + curThumb.getBoundingClientRect().top - d('leftContent').getBoundingClientRect().top;
                    }
                }
                if (typeof page2 != 'undefined') {
                    thumbnailPanel.children[page2 - 1].className = "thumbnail currentPageThumbnail";
                }
                scrollSidebar = true;
            };

            Sidebar.setBookmarks = function (bookmarks) {
                ClassHelper.addClass(sidebar, 'hasBookmarks');
                addBookmark(bookmarkPanel, bookmarks);
            };

            var addBookmark = function (container, bookmarks) {
                var outer = document.createElement('ul');

                var makeBookmarkClickHandler = function(pg, zoom) {
                    return function() {
                        IDRViewer.goToPage(parseInt(pg), zoom);
                    };
                };
                for (var i = 0; i < bookmarks.length; i++) {
                    var bookmark = bookmarks[i];
                    var li = document.createElement('li');
                    li.setAttribute('title', 'Page ' + bookmark.page);
                    li.innerHTML = bookmark.title;
                    li.onclick = makeBookmarkClickHandler(bookmark.page, bookmark.zoom);
                    outer.appendChild(li);
                    if (typeof(bookmark.children) != 'undefined') {
                        addBookmark(outer, bookmark.children);
                    }
                }
                container.appendChild(outer);
            };

            return Sidebar;
        })();

        var populateGoBtn = function () {
            Button.go.className = "";
            Button.go.innerHTML = "";
            for (var i = 1; i <= pgCount; i++) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.innerHTML = pageLabels.length ? pageLabels[i - 1] : String(i);
                Button.go.appendChild(opt);
            }
            Button.go.selectedIndex = curPg - 1;
        };

        var handleGoBtn = function () {
            IDRViewer.goToPage(parseInt(Button.go.options[Button.go.selectedIndex].value));
            this.blur();
        };

        var updateSelectionButtons = function (mode) {
            switch (mode) {
                case IDRViewer.SELECT_PAN:
                    Button.select.className = 'btn';
                    Button.move.className = 'disabled btn';
                    break;
                case IDRViewer.SELECT_SELECT:
                    Button.select.className = 'disabled btn';
                    Button.move.className = 'btn';
                    break;
            }
        };

        var handlePageChange = function (data) {
            d('pgCount').innerHTML = getPageString(data.page, data.pagecount);
            Sidebar.scrollToPage(data.page);
            Button.go.selectedIndex = data.page - 1;

            Button.prev.className = data.isFirstPage ? 'disabled btn' : 'btn';
            Button.next.className = data.isLastPage ? 'disabled btn' : 'btn';
        };

        var handleZoomUpdate = function (data) {
            Button.zoom.value = data.zoomType;
            Button.zoom.options[0].innerHTML = Math.floor(data.zoomValue * 100) + "%";

            Button.zoomOut.className = data.isMinZoom ? 'disabled btn' : 'btn';
            Button.zoomIn.className = data.isMaxZoom ? 'disabled btn' : 'btn';
        };

        var handleSelectionChange = function (data) {
            updateSelectionButtons(data.type);
        };

        var handleZoomBtn = function () {
            var zoomType = Button.zoom.value;
            if (zoomType != IDRViewer.ZOOM_SPECIFIC) {
                IDRViewer.setZoom(zoomType);
            }
            this.blur();
        };

        var handleViewBtn = function () {
            IDRViewer.setLayout(Button.View.value);
            this.blur();
        };

        var setupLayoutSwitching = function (layout, availableLayouts, isMobile) {

            if (!isMobile) {

                if (availableLayouts.length > 1 && pgCount > 1) {
                    Button.View = document.createElement('select');
                    Button.View.id = 'viewBtn';

                    var temp = document.createElement('option');
                    temp.innerHTML = "Presentation";
                    temp.value = IDRViewer.LAYOUT_PRESENTATION;
                    Button.View.appendChild(temp);

                    if (availableLayouts.indexOf(IDRViewer.LAYOUT_MAGAZINE) != -1) {
                        temp = document.createElement('option');
                        temp.innerHTML = "Magazine";
                        temp.value = IDRViewer.LAYOUT_MAGAZINE;
                        Button.View.appendChild(temp);
                    }
                    if (availableLayouts.indexOf(IDRViewer.LAYOUT_CONTINUOUS) != -1) {
                        temp = document.createElement('option');
                        temp.innerHTML = "Continuous";
                        temp.value = IDRViewer.LAYOUT_CONTINUOUS;
                        Button.View.appendChild(temp);
                    }
                    Button.View.onchange = handleViewBtn;
                    d('controls-center').appendChild(Button.View);
                    Button.View.value = layout;
                }

            } else {
                Button.zoom.parentNode.removeChild(Button.zoom);
                Button.move.parentNode.removeChild(Button.move);
                Button.select.parentNode.removeChild(Button.select);
                Button.zoomIn.parentNode.removeChild(Button.zoomIn);
                Button.zoomOut.parentNode.removeChild(Button.zoomOut);
            }
        };

        var handleFullscreenChange = function (data) {
            if (data.isFullscreen) {
                Button.fullscreen.className = "btn open";
            } else {
                Button.fullscreen.className = "btn closed";
            }
        };

        var pageLabels = [];

        function getPageString(page, pageCount) {
            var result = "/ " + pageCount;
            if (pageLabels.length) {
                result =  "(" + page + " / " + pageCount + ")";
            }
            return result;
        }

        var doSearch = function() {
            var resultDiv = document.getElementById('searchResults');
            resultDiv.innerHTML = "";

            var searchTerm = d('searchInput').value;
            var matchCase = d('cbMatchCase').checked;
            var limitOnePerPage = d('cbLimitResults').checked;

            var results = IDRViewer.search(searchTerm, matchCase, limitOnePerPage);

            d('searchResultsCount').innerHTML = String(results.length) + " results";

            var docFrag = document.createDocumentFragment();
            for (var i = 0; i < results.length && i < 500; i++) {
                var pg = results[i].page;

                var link = document.createElement("a");
                link.href = "?page=" + pg;
                link.innerHTML = results[i].snippet;
                link.className = "result";
                (function(page) {
                    link.onclick = function() {
                        IDRViewer.goToPage(page);
                        return false;
                    };
                })(pg);

                docFrag.appendChild(link);

            }
            if (results.length >= 500) {
                var element = document.createElement("span");
                element.innerHTML = "Limited to first 500 results.";
                element.className = "result";
                docFrag.appendChild(element);
            }
            resultDiv.appendChild(docFrag);
        };

        /**
         * Main setup function that runs on load
         */
        IDRViewer.on('ready', function (data) {

            // Grab buttons
            Button.go = d('goBtn');
            Button.zoom = d('zoomBtn');
            Button.fullscreen = d('btnFullScreen');
            Button.prev = d('btnPrev');
            Button.next = d('btnNext');
            Button.move = d('btnMove');
            Button.select = d('btnSelect');
            Button.zoomIn = d('btnZoomIn');
            Button.zoomOut = d('btnZoomOut');

            Button.prev.className = data.isFirstPage ? 'disabled btn' : 'btn';
            Button.next.className = data.isLastPage ? 'disabled btn' : 'btn';

            // Set button actions
            Button.go.onchange = handleGoBtn;
            Button.zoom.onchange = handleZoomBtn;
            Button.prev.onclick = function (e) { IDRViewer.prev(); e.preventDefault(); };
            Button.next.onclick = function (e) { IDRViewer.next(); e.preventDefault(); };
            Button.move.onclick = function (e) { IDRViewer.setSelectMode(IDRViewer.SELECT_PAN); e.preventDefault(); };
            Button.select.onclick = function (e) { IDRViewer.setSelectMode(IDRViewer.SELECT_SELECT); e.preventDefault(); };
            Button.zoomIn.onclick = function (e) { IDRViewer.zoomIn(); e.preventDefault(); };
            Button.zoomOut.onclick = function (e) { IDRViewer.zoomOut(); e.preventDefault(); };

            document.onkeydown = function(e) {
                switch (e.keyCode) {
                    case 33: // Page Up
                    case 37: // Left Arrow
                        IDRViewer.prev();
                        e.preventDefault();
                        break;
                    case 34: // Page Down
                    case 39: // Right Arrow
                        IDRViewer.next();
                        e.preventDefault();
                        break;
                    case 36: // Home
                        IDRViewer.goToPage(1);
                        e.preventDefault();
                        break;
                    case 35: // End
                        IDRViewer.goToPage(data.pagecount);
                        e.preventDefault();
                        break;
                }
            };

            // Misc setup
            document.title = data.title ? data.title : data.fileName;
            curPg = data.page;
            updateSelectionButtons(data.selectMode);
            pageLabels = data.pageLabels;
            pgCount = data.pagecount;

            populateGoBtn();

            Sidebar.setup(data.bounds, data.thumbnailType, data.bookmarks);
            d('pgCount').innerHTML = getPageString(data.page, data.pagecount);

            if (IDRViewer.isFullscreenEnabled()) {
                Button.fullscreen.onclick = function () {
                    IDRViewer.toggleFullScreen();
                };
                IDRViewer.on('fullscreenchange', handleFullscreenChange);
            } else {
                Button.fullscreen.parentNode.removeChild(Button.fullscreen);
            }

            setupLayoutSwitching(data.layout, data.availableLayouts, data.isMobile);
            Button.zoom.value = IDRViewer.ZOOM_AUTO;

            // Add event listeners
            IDRViewer.on('selectchange', handleSelectionChange);
            IDRViewer.on('pagechange', handlePageChange);
            IDRViewer.on('zoomchange', handleZoomUpdate);

            var themeToggle = false;
            d('btnThemeToggle').addEventListener('click', function() {
                ClassHelper.removeClass(document.body, "light-theme");
                ClassHelper.removeClass(document.body, "dark-theme");
                ClassHelper.addClass(document.body, themeToggle ? "light-theme" : "dark-theme");
                themeToggle = !themeToggle;
            });

            var searchInput = d('searchInput');
            searchInput.value = "Loading";
            searchInput.disabled = "disabled";
            searchInput.oninput = doSearch;
            d('cbMatchCase').onclick = doSearch;
            d('cbLimitResults').onclick = doSearch;

            document.addEventListener('keydown', function(event) {
                if (event.keyCode == 70 && (event.ctrlKey || event.metaKey)) {
                    Sidebar.openSidebar();
                    Sidebar.switchToSearch();
                    event.preventDefault();
                }
            });
        });
    };

})();