(function() {
    'use strict';

    // ===== DOM Elements =====
    var callWidget = document.getElementById('callWidget');
    var callDurationEl = document.getElementById('callDuration');
    var hangupBtn = document.getElementById('hangupBtn');
    var micBtn = document.getElementById('micBtn');
    var micOnSvg = micBtn.querySelector('.mic-on');
    var micOffSvg = micBtn.querySelector('.mic-off');
    var muteLockTip = document.getElementById('muteLockTip');
    var callerIdEl = document.getElementById('callerId');

    var quickBroadcastBtn = document.getElementById('quickBroadcastBtn');
    var subtitleBtn = document.getElementById('subtitleBtn');
    var broadcastPanel = document.getElementById('broadcastPanel');
    var subtitlePanel = document.getElementById('subtitlePanel');
    var closeBroadcastPanel = document.getElementById('closeBroadcastPanel');
    var closeSubtitlePanel = document.getElementById('closeSubtitlePanel');

    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabContents = document.querySelectorAll('.tab-content');

    var safetyList = document.getElementById('safetyList');
    var urgingList = document.getElementById('urgingList');
    var operationList = document.getElementById('operationList');
    var comfortList = document.getElementById('comfortList');

    var customInput = document.getElementById('customInput');
    var charCount = document.getElementById('charCount');
    var translateBtn = document.getElementById('translateBtn');
    var translateResult = document.getElementById('translateResult');

    var broadcastStatus = document.getElementById('broadcastStatus');
    var statusText = document.getElementById('statusText');
    var submitBroadcastBtn = document.getElementById('submitBroadcastBtn');
    var stopBroadcastBtn = document.getElementById('stopBroadcastBtn');
    var broadcastContentZh = document.getElementById('broadcastContentZh');
    var broadcastContentEn = document.getElementById('broadcastContentEn');

    var subtitleContent = document.getElementById('subtitleContent');
    var autoOpenToast = document.getElementById('autoOpenToast');

    // ===== State Variables =====
    var durationSeconds = 17;
    var timerInterval = null;
    var isCallActive = true;
    var isMuted = false;
    var isMuteLocked = false;

    var selectedScript = null;
    var currentTab = 'safety';

    var isBroadcasting = false;
    var broadcastTimer = null;
    var currentBroadcastContent = '';

    var broadcastRecords = [];
    var roName = 'RO_001';
    var carNumber = '[L4]k9254';

    var subtitleItems = [];
    var isSubtitleOpen = false;

    // ===== Scripts Data =====
    var scriptsData = {
        safety: [
            { id: 'S001', cn: '请系好安全带', en: 'Please fasten your seatbelt.' },
            { id: 'S002', cn: '车辆即将起步，请坐稳扶好', en: 'The vehicle is about to start, please sit tight and hold on.' },
            { id: 'S003', cn: '请勿将手或头伸出窗外', en: 'Please do not extend your hands or head out of the window.' },
            { id: 'S004', cn: '到达目的地前请不要解开安全带', en: 'Please do not unfasten your seatbelt before arriving at your destination.' }
        ],
        urging: [
            { id: 'U001', cn: '请您尽快上车，车辆即将出发', en: 'Please get in the car as soon as possible, the vehicle is about to depart.' },
            { id: 'U002', cn: '您已到达目的地，请带好随身物品下车', en: 'You have arrived at your destination, please take your belongings and get off.' },
            { id: 'U003', cn: '请您确认下车地点是否正确', en: 'Please confirm if the drop-off location is correct.' },
            { id: 'U004', cn: '行程还有5分钟到达，请做好准备', en: 'We will arrive in 5 minutes, please get ready.' }
        ],
        operation: [
            { id: 'O001', cn: '请问您需要调整车内温度吗', en: 'Would you like to adjust the in-car temperature?' },
            { id: 'O002', cn: '车内WiFi已开启，密码在座椅后背', en: 'In-car WiFi is on, the password is on the back of the seat.' },
            { id: 'O003', cn: '您可以通过中控屏调节音乐和空调', en: 'You can adjust music and air conditioning through the central screen.' },
            { id: 'O004', cn: '如需帮助请按车内呼叫按钮', en: 'If you need help, please press the in-car call button.' }
        ],
        comfort: [
            { id: 'C001', cn: '欢迎乘坐Robotaxi，祝您旅途愉快', en: 'Welcome to Robotaxi, wish you a pleasant journey.' },
            { id: 'C002', cn: '请放心，我们的车辆经过严格安全检测', en: 'Please rest assured, our vehicles have passed strict safety inspections.' },
            { id: 'C003', cn: '感谢您的乘坐，期待下次再见', en: 'Thank you for riding with us, see you next time.' },
            { id: 'C004', cn: '如有任何问题，我会随时为您服务', en: 'If you have any questions, I am always at your service.' }
        ]
    };

    // ===== Utility Functions =====
    function formatTime(totalSeconds) {
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var minStr = minutes < 10 ? '0' + minutes : String(minutes);
        var secStr = seconds < 10 ? '0' + seconds : String(seconds);
        return minStr + ':' + secStr;
    }

    function getNowTime() {
        var now = new Date();
        var hours = now.getHours() < 10 ? '0' + now.getHours() : now.getHours();
        var minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
        return hours + ':' + minutes;
    }

    function getFullTime() {
        var now = new Date();
        return now.toLocaleString('zh-CN');
    }

    // ===== Duration Timer =====
    function updateDurationDisplay() {
        callDurationEl.textContent = formatTime(durationSeconds);
    }

    function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(function() {
            if (isCallActive) {
                durationSeconds++;
                updateDurationDisplay();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // ===== Mute Controls =====
    function toggleMute() {
        if (!isCallActive) return;
        if (isMuteLocked && isMuted) {
            showMuteLockTip();
            return;
        }
        isMuted = !isMuted;
        updateMicDisplay();
        if (typeof CallWidgetAPI !== 'undefined' && CallWidgetAPI.onMuteChanged) {
            CallWidgetAPI.onMuteChanged(isMuted);
        }
    }

    function updateMicDisplay() {
        if (isMuted) {
            micBtn.classList.add('muted');
            micBtn.setAttribute('aria-label', '取消静音');
            micOnSvg.style.display = 'none';
            micOffSvg.style.display = 'block';
        } else {
            micBtn.classList.remove('muted');
            micBtn.setAttribute('aria-label', '静音');
            micOnSvg.style.display = 'block';
            micOffSvg.style.display = 'none';
        }
    }

    function setMuted(muted) {
        if (!isCallActive) return;
        if (isMuted === muted) return;
        isMuted = muted;
        updateMicDisplay();
        if (typeof CallWidgetAPI !== 'undefined' && CallWidgetAPI.onMuteChanged) {
            CallWidgetAPI.onMuteChanged(isMuted);
        }
    }

    function setMuteLocked(locked) {
        isMuteLocked = locked;
    }

    var muteLockTipTimer = null;
    function showMuteLockTip() {
        muteLockTip.classList.add('show');
        if (muteLockTipTimer) clearTimeout(muteLockTipTimer);
        muteLockTipTimer = setTimeout(function() {
            muteLockTip.classList.remove('show');
        }, 2000);
    }

    // ===== Call Controls =====
    function hangupCall() {
        if (!isCallActive) return;

        isCallActive = false;
        stopTimer();
        stopBroadcast();
        callWidget.classList.add('ending');

        hangupBtn.disabled = true;
        hangupBtn.style.opacity = '0.7';
        hangupBtn.style.cursor = 'not-allowed';

        micBtn.disabled = true;
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';

        callerIdEl.textContent = '通话已结束';

        setTimeout(function() {
            if (typeof CallWidgetAPI !== 'undefined' && CallWidgetAPI.onCallEnded) {
                CallWidgetAPI.onCallEnded({
                    duration: durationSeconds,
                    callerId: carNumber
                });
            }
        }, 300);
    }

    function initCall(callerId, initialSeconds) {
        if (initialSeconds !== undefined && initialSeconds !== null) {
            durationSeconds = initialSeconds;
            updateDurationDisplay();
        }
        if (callerId) {
            carNumber = callerId;
            callerIdEl.textContent = callerId + ' 通话中';
        }
        isCallActive = true;
        isMuted = false;
        isMuteLocked = false;
        updateMicDisplay();
        callWidget.classList.remove('ending');
        hangupBtn.disabled = false;
        hangupBtn.style.opacity = '1';
        hangupBtn.style.cursor = 'pointer';
        micBtn.disabled = false;
        micBtn.style.opacity = '1';
        micBtn.style.cursor = 'pointer';
        startTimer();
    }

    // ===== Panel Toggle =====
    function toggleBroadcastPanel() {
        if (broadcastPanel.classList.contains('show')) {
            broadcastPanel.classList.remove('show');
            quickBroadcastBtn.classList.remove('active');
        } else {
            broadcastPanel.classList.add('show');
            quickBroadcastBtn.classList.add('active');
            subtitlePanel.classList.remove('show');
            subtitleBtn.classList.remove('active');
        }
    }

    function toggleSubtitlePanel() {
        if (subtitlePanel.classList.contains('show')) {
            subtitlePanel.classList.remove('show');
            subtitleBtn.classList.remove('active');
            isSubtitleOpen = false;
        } else {
            subtitlePanel.classList.add('show');
            subtitleBtn.classList.add('active');
            broadcastPanel.classList.remove('show');
            quickBroadcastBtn.classList.remove('active');
            isSubtitleOpen = true;
        }
    }

    // ===== Tab Switching =====
    function switchTab(tabName) {
        currentTab = tabName;
        tabBtns.forEach(function(btn) {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        tabContents.forEach(function(content) {
            if (content.id === 'tab-' + tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        
        if (tabName === 'custom') {
            selectedScript = null;
            updateSubmitButton();
        } else {
            clearCustomSelection();
        }
    }

    // ===== Script List Rendering =====
    function renderScriptList(category, container) {
        var scripts = scriptsData[category];
        container.innerHTML = '';
        scripts.forEach(function(script) {
            var item = document.createElement('div');
            item.className = 'script-item';
            item.setAttribute('data-id', script.id);
            item.setAttribute('data-category', category);
            item.innerHTML = 
                '<div class="script-radio"></div>' +
                '<div class="script-text">' +
                    '<div class="script-cn">' + script.cn + '</div>' +
                    '<div class="script-en">' + script.en + '</div>' +
                '</div>';
            item.addEventListener('click', function() {
                if (isBroadcasting) return;
                selectScript(script, category, item);
            });
            container.appendChild(item);
        });
    }

    function selectScript(script, category, element) {
        selectedScript = script;
        var allItems = document.querySelectorAll('.script-item');
        allItems.forEach(function(item) {
            item.classList.remove('selected');
        });
        element.classList.add('selected');
        updateSubmitButton();
    }

    function clearCustomSelection() {
        var translatedText = translateResult.querySelector('.result-text');
        if (translatedText) {
            selectedScript = {
                id: 'CUSTOM',
                cn: customInput.value,
                en: translatedText.textContent
            };
        }
        updateSubmitButton();
    }

    function updateSubmitButton() {
        var canSubmit = false;
        if (currentTab === 'custom') {
            var resultText = translateResult.querySelector('.result-text');
            canSubmit = resultText && resultText.textContent.length > 0 && !isBroadcasting;
        } else {
            canSubmit = selectedScript !== null && !isBroadcasting;
        }
        submitBroadcastBtn.disabled = !canSubmit;
    }

    // ===== Custom Translation =====
    function updateCharCount() {
        var len = customInput.value.length;
        charCount.textContent = len + '/50';
        translateBtn.disabled = len === 0;
    }

    var robotaxiTerms = {
        '自动驾驶': 'autonomous driving',
        '无人驾驶': 'driverless',
        'Robotaxi': 'Robotaxi',
        '自动驾驶出租车': 'autonomous taxi',
        '安全员': 'safety operator',
        '远程服务': 'remote service',
        '舱内': 'in-cabin',
        '中控屏': 'central display screen',
        '车机': 'in-vehicle infotainment system',
        '智驾': 'intelligent driving',
        '智舱': 'intelligent cabin',
        'OTA': 'OTA'
    };

    function translateText(text) {
        var translated = text;
        for (var cn in robotaxiTerms) {
            if (robotaxiTerms.hasOwnProperty(cn)) {
                var en = robotaxiTerms[cn];
                translated = translated.replace(new RegExp(cn, 'g'), en);
            }
        }
        
        if (translated === text) {
            translated = 'Thank you for your message. We will process it as soon as possible.';
            if (text.indexOf('请问') !== -1 || text.indexOf('吗') !== -1) {
                translated = 'Thank you for your question. Let me check that for you.';
            } else if (text.indexOf('请') !== -1) {
                translated = 'Please follow the instructions. Thank you for your cooperation.';
            }
        }
        
        return translated;
    }

    function handleTranslate() {
        var text = customInput.value.trim();
        if (!text) return;
        
        translateBtn.disabled = true;
        translateResult.innerHTML = '<span class="placeholder-text">翻译中...</span>';
        
        setTimeout(function() {
            var result = translateText(text);
            translateResult.innerHTML = '<span class="result-text">' + result + '</span>';
            selectedScript = {
                id: 'CUSTOM',
                cn: text,
                en: result
            };
            translateBtn.disabled = customInput.value.length === 0;
            updateSubmitButton();
        }, 600);
    }

    // ===== Broadcast Controls =====
    function startBroadcast() {
        if (isBroadcasting) return;
        var zhText = '';
        var enText = '';
        if (currentTab === 'custom') {
            var resultText = translateResult.querySelector('.result-text');
            if (!resultText) return;
            zhText = customInput.value.trim();
            enText = resultText.textContent;
            currentBroadcastContent = enText;
        } else if (selectedScript) {
            zhText = selectedScript.cn;
            enText = selectedScript.en;
            currentBroadcastContent = enText;
        } else {
            return;
        }

        isBroadcasting = true;
        setMuted(true);
        setMuteLocked(true);

        broadcastStatus.style.display = 'flex';
        statusText.textContent = '播报中...';
        broadcastContentZh.textContent = zhText;
        broadcastContentEn.textContent = enText;
        submitBroadcastBtn.style.display = 'none';
        stopBroadcastBtn.style.display = 'inline-block';

        submitBroadcastBtn.disabled = true;

        var broadcastDuration = Math.max(3000, currentBroadcastContent.length * 150);
        broadcastTimer = setTimeout(function() {
            completeBroadcast();
        }, broadcastDuration);

        addBroadcastRecord();
    }

    function stopBroadcast() {
        if (!isBroadcasting) return;
        if (broadcastTimer) {
            clearTimeout(broadcastTimer);
            broadcastTimer = null;
        }
        isBroadcasting = false;
        setMuteLocked(false);
        setMuted(false);

        broadcastStatus.style.display = 'none';
        submitBroadcastBtn.style.display = 'flex';
        stopBroadcastBtn.style.display = 'none';

        updateSubmitButton();
        translateBtn.disabled = customInput.value.length === 0;
    }

    function completeBroadcast() {
        if (broadcastTimer) {
            clearTimeout(broadcastTimer);
            broadcastTimer = null;
        }
        isBroadcasting = false;
        setMuteLocked(false);
        setMuted(false);

        statusText.textContent = '播报完成';
        stopBroadcastBtn.style.display = 'none';

        setTimeout(function() {
            broadcastStatus.style.display = 'none';
            submitBroadcastBtn.style.display = 'flex';
            updateSubmitButton();
            translateBtn.disabled = customInput.value.length === 0;
        }, 1500);
    }

    function addBroadcastRecord() {
        var record = {
            roName: roName,
            time: getFullTime(),
            carNumber: carNumber,
            scriptId: selectedScript ? selectedScript.id : 'CUSTOM',
            contentCn: selectedScript ? selectedScript.cn : customInput.value,
            contentEn: currentBroadcastContent,
            type: currentTab === 'custom' ? 'custom' : 'preset'
        };
        broadcastRecords.push(record);
        console.log('[Broadcast Record]', record);
    }

    // ===== Subtitle Module =====
    function addSubtitleItem(enText, zhText, isRecognizing) {
        var item = {
            id: Date.now(),
            time: getNowTime(),
            en: enText,
            zh: zhText,
            recognizing: isRecognizing || false
        };
        subtitleItems.push(item);
        if (subtitleItems.length > 10) {
            subtitleItems.shift();
        }
        renderSubtitles();
        return item.id;
    }

    function updateSubtitleItem(id, enText, zhText, isRecognizing) {
        for (var i = 0; i < subtitleItems.length; i++) {
            if (subtitleItems[i].id === id) {
                subtitleItems[i].en = enText;
                subtitleItems[i].zh = zhText;
                subtitleItems[i].recognizing = isRecognizing || false;
                break;
            }
        }
        renderSubtitles();
    }

    function renderSubtitles() {
        if (subtitleItems.length === 0) {
            subtitleContent.innerHTML = '<div class="subtitle-empty">暂无字幕内容</div>';
            return;
        }

        var html = '';
        subtitleItems.forEach(function(item) {
            var recognizingClass = item.recognizing ? ' subtitle-recognizing' : '';
            var emptyClass = item.recognizing && !item.en && !item.zh ? ' subtitle-empty' : '';
            html += 
                '<div class="subtitle-item' + recognizingClass + emptyClass + '">' +
                    '<div class="subtitle-time">' + item.time + '</div>' +
                    '<div class="subtitle-en">' + item.en + '</div>' +
                    '<div class="subtitle-zh">' + item.zh + '</div>' +
                '</div>';
        });
        subtitleContent.innerHTML = html;
        subtitleContent.scrollTop = subtitleContent.scrollHeight;
    }

    function showAutoOpenToast() {
        autoOpenToast.classList.add('show');
        setTimeout(function() {
            autoOpenToast.classList.remove('show');
        }, 5000);
    }

    function autoOpenSubtitle() {
        if (!isSubtitleOpen) {
            subtitlePanel.classList.add('show');
            subtitleBtn.classList.add('active');
            isSubtitleOpen = true;
            showAutoOpenToast();
        }
    }

    function simulateSubtitles() {
        var sampleDialogs = [
            { en: 'Hello, where is this car going?', zh: '你好，这辆车要去哪里？' },
            { en: 'I want to go to the shopping mall.', zh: '我想去购物中心。' },
            { en: 'How long will it take to get there?', zh: '到那里需要多长时间？' },
            { en: 'Can I play some music?', zh: '我可以放点音乐吗？' },
            { en: 'The air conditioning is a bit cold.', zh: '空调有点冷。' }
        ];

        var currentIndex = 0;
        setInterval(function() {
            if (!isSubtitleOpen || currentIndex >= sampleDialogs.length) return;
            
            var dialog = sampleDialogs[currentIndex];
            var itemId = addSubtitleItem('', '', true);
            
            setTimeout(function() {
                updateSubtitleItem(itemId, dialog.en.substring(0, 5), '', true);
            }, 600);
            
            setTimeout(function() {
                updateSubtitleItem(itemId, dialog.en, '', true);
            }, 1200);
            
            setTimeout(function() {
                updateSubtitleItem(itemId, dialog.en, dialog.zh, false);
            }, 2000);
            
            currentIndex++;
        }, 8000);
    }

    // ===== Initialize =====
    function init() {
        renderScriptList('safety', safetyList);
        renderScriptList('urging', urgingList);
        renderScriptList('operation', operationList);
        renderScriptList('comfort', comfortList);

        micBtn.addEventListener('click', toggleMute);
        hangupBtn.addEventListener('click', hangupCall);
        quickBroadcastBtn.addEventListener('click', toggleBroadcastPanel);
        subtitleBtn.addEventListener('click', toggleSubtitlePanel);
        closeBroadcastPanel.addEventListener('click', toggleBroadcastPanel);
        closeSubtitlePanel.addEventListener('click', toggleSubtitlePanel);

        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                if (isBroadcasting) return;
                var tabName = btn.getAttribute('data-tab');
                switchTab(tabName);
            });
        });

        customInput.addEventListener('input', updateCharCount);
        translateBtn.addEventListener('click', handleTranslate);
        submitBroadcastBtn.addEventListener('click', startBroadcast);
        stopBroadcastBtn.addEventListener('click', stopBroadcast);

        updateDurationDisplay();
        updateMicDisplay();
        updateCharCount();
        startTimer();

        setTimeout(function() {
            autoOpenSubtitle();
            simulateSubtitles();
        }, 3000);
    }

    // ===== Public API =====
    window.CallWidgetAPI = {
        initCall: initCall,
        hangup: hangupCall,
        getDuration: function() {
            return durationSeconds;
        },
        isActive: function() {
            return isCallActive;
        },
        isMuted: function() {
            return isMuted;
        },
        toggleMute: toggleMute,
        setMuted: setMuted,
        isBroadcasting: function() {
            return isBroadcasting;
        },
        getBroadcastRecords: function() {
            return broadcastRecords.slice();
        },
        addSubtitle: addSubtitleItem,
        updateSubtitle: updateSubtitleItem,
        openSubtitle: function() {
            if (!isSubtitleOpen) toggleSubtitlePanel();
        },
        closeSubtitle: function() {
            if (isSubtitleOpen) toggleSubtitlePanel();
        },
        autoOpenSubtitle: autoOpenSubtitle,
        onCallEnded: null,
        onMuteChanged: null,
        onBroadcastStarted: null,
        onBroadcastEnded: null,
        onBroadcastStopped: null
    };

    init();
})();
