// ============================================================================
// МОДУЛЬ: ИНЖЕНЕРНЫЙ РАЗБОР (ОБУЧЕНИЕ) - РЕЛИЗ 1.4
// Убран автозапуск первой группы. При старте все аккордеоны свернуты,
// экран чист, чтобы не провоцировать пользователя и не обрывать аудио-вводную.
// ============================================================================

const LearningModule = {
    currentMuffId: '3stp10',
    activeGroup: null,
    activeCompId: null,
    
    init() {
        if (!window.MuffsRegistry || !window.MuffsRegistry[this.currentMuffId]) {
            console.error("КРИТИЧЕСКАЯ ОШИБКА: База данных не найдена!");
            return;
        }
        this.renderGroupsAndComponents();
        this.loadMuffImage();
        this.initResizeRadar();
    },

    getMuffData() {
        return window.MuffsRegistry[this.currentMuffId];
    },

    initResizeRadar() {
        const wrapperEl = document.getElementById('image-wrapper');
        if (!wrapperEl) return;

        const resizeObserver = new ResizeObserver(() => {
            if (this.activeGroup) {
                requestAnimationFrame(() => this.renderHotspots());
            }
        });

        resizeObserver.observe(wrapperEl);
    },

    renderGroupsAndComponents() {
        const data = this.getMuffData();
        const container = document.getElementById('learning-groups-list');
        if (!container) return;
        container.innerHTML = ''; 

        data.groups.forEach((groupName, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-container';
            groupDiv.id = `group-cnt-${index}`;

            const header = document.createElement('button');
            header.className = 'group-header-btn';
            header.innerHTML = `<span>${groupName}</span> <span>▼</span>`;
            header.onclick = () => this.toggleGroup(groupDiv, groupName);

            const sublist = document.createElement('div');
            sublist.className = 'component-sublist';

            const groupComponents = data.components.filter(c => c.group === groupName);
            groupComponents.forEach(comp => {
                const compBtn = document.createElement('button');
                compBtn.className = 'sub-comp-btn';
                compBtn.id = `btn-comp-${comp.id}`;
                compBtn.textContent = comp.name;
                
                if (!comp.ui) {
                    compBtn.innerHTML = `${comp.name} <span style="color:#555; font-size:0.7rem; float:right;">(Скрыт)</span>`;
                }

                compBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.selectComponent(comp);
                };
                sublist.appendChild(compBtn);
            });

            groupDiv.appendChild(header);
            groupDiv.appendChild(sublist);
            container.appendChild(groupDiv);

            // КРИТИЧЕСКАЯ ПРАВКА: Убрано принудительное открытие первой группы.
            // Теперь при загрузке все вкладки остаются закрытыми.
        });
    },

    toggleGroup(el, groupName) {
        const isCurrentlyActive = el.classList.contains('active');

        // 1. Закрываем все открытые группы для эффекта "строгого аккордеона"
        document.querySelectorAll('.group-container').forEach(container => {
            container.classList.remove('active');
        });

        if (isCurrentlyActive) {
            // Если кликнули по уже открытой группе — закрываем её и сбрасываем мозги системы
            this.activeGroup = null;
            this.activeCompId = null;
            document.getElementById('learning-comp-group').textContent = "Группа не выбрана";
            this.clearComponentInfo();
        } else {
            // Если открываем новую группу — активируем её
            el.classList.add('active');
            this.activeGroup = groupName;
            document.getElementById('learning-comp-group').textContent = groupName;
        }

        // Перерисовываем точки с учетом новых вводных
        this.renderHotspots(); 
    },

    // Функция обнуления текстовой панели
    clearComponentInfo() {
        document.getElementById('learning-comp-name').textContent = "Выберите узел для анализа";
        document.getElementById('learning-purpose').textContent = "Нажмите на любую пульсирующую точку на схеме...";
        document.getElementById('learning-function').textContent = "—";
        document.getElementById('learning-failure').textContent = "—";
        document.getElementById('learning-criticality').textContent = "—";
        document.getElementById('learning-norms').innerHTML = "—";
        
        // Снимаем синее выделение со всех кнопок в меню
        document.querySelectorAll('.sub-comp-btn').forEach(b => b.classList.remove('active'));
    },

    loadMuffImage() {
        const data = this.getMuffData();
        const imgEl = document.getElementById('learning-image');
        if (imgEl) {
            imgEl.src = data.meta.image;
            if (imgEl.complete) {
                if (this.activeGroup) this.renderHotspots();
            } else {
                imgEl.onload = () => {
                    if (this.activeGroup) this.renderHotspots();
                };
            }
        }
    },

    selectComponent(comp) {
        this.activeCompId = comp.id;

        // Выделение в списке
        document.querySelectorAll('.sub-comp-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`btn-comp-${comp.id}`);
        if (btn) btn.classList.add('active');

        // Выделение точки на картинке (если она есть)
        document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('active'));
        if (comp.ui) {
            const hotspot = document.querySelector(`.hotspot[data-id="${comp.id}"]`);
            if (hotspot) hotspot.classList.add('active');
        }

        this.showComponentInfo(comp);
    },

    renderHotspots() {
        const data = this.getMuffData();
        const container = document.getElementById('hotspots-container');
        const imgEl = document.getElementById('learning-image');
        const wrapperEl = document.getElementById('image-wrapper');
        
        if (!container || !imgEl || !wrapperEl) return;

        const nw = imgEl.naturalWidth;
        const nh = imgEl.naturalHeight;
        const cw = wrapperEl.clientWidth;
        const ch = wrapperEl.clientHeight;

        if (!nw || !nh || cw === 0 || ch === 0) return; 

        // Всегда стираем старые точки перед новой отрисовкой
        container.innerHTML = ''; 

        // Если активной группы нет (все вкладки закрыты), просто выходим, оставляя экран чистым
        if (!this.activeGroup) return;

        const scale = Math.min(cw / nw, ch / nh);
        const renderedWidth = nw * scale;
        const renderedHeight = nh * scale;

        const offsetX = (cw - renderedWidth) / 2;
        const offsetY = (ch - renderedHeight) / 2;

        const groupComponents = data.components.filter(c => c.group === this.activeGroup);

        groupComponents.forEach(comp => {
            if (!comp.ui || comp.ui.top === undefined) return;

            const dotX = offsetX + (comp.ui.left / 100) * renderedWidth;
            const dotY = offsetY + (comp.ui.top / 100) * renderedHeight;

            const dot = document.createElement('div');
            dot.className = 'hotspot';
            dot.setAttribute('data-id', comp.id);
            dot.style.left = `${dotX}px`;
            dot.style.top = `${dotY}px`;
            dot.innerHTML = `<div class="hotspot-ring"></div><div class="hotspot-dot"></div>`;

            if (this.activeCompId === comp.id) dot.classList.add('active');

            dot.onclick = (e) => {
                e.stopPropagation(); 
                this.selectComponent(comp);
            };
            container.appendChild(dot);
        });
    },

    showComponentInfo(comp) {
        document.getElementById('learning-comp-name').textContent = comp.name;
        document.getElementById('learning-purpose').textContent = comp.physics.purpose || "—";
        document.getElementById('learning-function').textContent = comp.physics.function || "—";
        document.getElementById('learning-failure').textContent = comp.physics.failure_mode || "—";
        document.getElementById('learning-criticality').textContent = comp.physics.criticality_explanation || "—";

        const normsContainer = document.getElementById('learning-norms');
        normsContainer.innerHTML = '';
        
        if (comp.norms) {
            let normsHtml = '<ul style="list-style: none; padding: 0;">';
            for (const [key, normData] of Object.entries(comp.norms)) {
                const cleanKey = key.replace(/_/g, ' ').replace(/(^\w)/, c => c.toUpperCase());
                normsHtml += `<li style="margin-bottom: 8px;"><strong style="color: #ffd700;">${cleanKey}:</strong> <span style="color: #fff;">${normData.значение} ${normData.единица}</span><br><span style="color: #8B9BB4; font-size: 0.8rem;"><i>${normData.обоснование}</i></span></li>`;
            }
            normsHtml += '</ul>';
            normsContainer.innerHTML = normsHtml;
        } else {
            normsContainer.innerHTML = '<div style="color:#888; font-size:0.85rem;">Допуски и физические размеры для данного материала не регламентированы.</div>';
        }

        if (window.AudioEngine) window.AudioEngine.playOnce('hotspot_help');
    }
};

document.addEventListener('DOMContentLoaded', () => LearningModule.init());