import MediumEditor from 'medium-editor';
import utils from './utils';
import Images from './addons/Images';
import Video from './addons/Video';
import Embeds from './addons/Embeds';
import Horizon from './addons/Horizon';

export default class Core {

    constructor(plugin) {
        this._plugin = plugin;
        this._editor = this._plugin.base;

        this.initAddons();
        this.addButtons();
        this.events();
    }

    events() {
        let addonActions;

        // This could be chained when medium-editor 5.15.2 is released
        // https://github.com/yabwe/medium-editor/pull/1046
        this._plugin.on(document, 'click', this.toggleButtons.bind(this));
        this._plugin.on(document, 'keyup', this.toggleButtons.bind(this));
        this._plugin.on(document, 'selectionchange', this.changeSelectionUpdateState.bind(this));
        this._plugin.on(this.buttons.getElementsByClassName('medium-editor-insert-buttons-show')[0], 'click', this.toggleAddons.bind(this));

        // This could be written in one statement when medium-editor 5.15.2 is released
        // https://github.com/yabwe/medium-editor/pull/1046
        addonActions = this.buttons.getElementsByClassName('medium-editor-insert-action');
        Array.prototype.forEach.call(addonActions, (action) => {
            this._plugin.on(action, 'click', this.handleAddonClick.bind(this));
        });

        this._plugin.on(window, 'resize', this.positionButtons.bind(this));
    }

    initAddons() {
        // Initialize all default addons, we'll delete ones we don't need later
        this._plugin._initializedAddons = {
            images: new Images(this._plugin, this._plugin.addons.images),
            video: new Video(this._plugin, this._plugin.addons.video),
            embeds: new Embeds(this._plugin, this._plugin.addons.embeds),
            horizon: new Horizon(this._plugin, this._plugin.addons.horizon)
        };

        Object.keys(this._plugin.addons).forEach((name) => {
            const addonOptions = this._plugin.addons[name];

            // If the addon is custom one
            if (!this._plugin._initializedAddons[name]) {
                if (typeof addonOptions === 'function') {
                    this._plugin._initializedAddons[name] = new addonOptions(this._plugin);
                } else {
                    window.console.error(`I don't know how to initialize custom "${name}" addon!`);
                }
            }

            // Delete disabled addon
            if (!addonOptions) {
                delete this._plugin._initializedAddons[name];
            }
        });
    }

    addButtons() {
        const addons = this._plugin.getAddons();
        let html;

        this.buttons = document.createElement('div');
        this.buttons.id = `medium-editor-insert-${this._plugin.getEditorId()}`;
        this.buttons.classList.add('medium-editor-insert-buttons');
        this.buttons.setAttribute('contentediable', false);

        html = `<a class="medium-editor-insert-buttons-show" title="挿入">${this._plugin.addLabel || '+'}</a>
            <ul class="medium-editor-insert-buttons-addons">`;

        Object.keys(addons).forEach((name) => {
            const addon = addons[name];

            html += `<li><a class="medium-editor-insert-action" data-addon="${name}" title="${addon.options.aria}">${addon.label}</a></li>`;
        });

        html += `</ul>`;

        this.buttons.innerHTML = html;

        document.body.appendChild(this.buttons);
    }

    removeButtons() {
        this.buttons.remove();
    }

    positionButtons() {
        let el, elPosition, addons, addonButton, addonsStyle, addonButtonStyle, position;

        // Don't position buttons if they aren't active
        if (this.buttons.classList.contains('medium-editor-insert-buttons-active') === false) {
            return;
        }

        el = this._editor.getSelectedParentElement();
        elPosition = el.getBoundingClientRect();
        addons = this.buttons.getElementsByClassName('medium-editor-insert-buttons-addons')[0];
        addonButton = this.buttons.getElementsByClassName('medium-editor-insert-action')[0];
        addonsStyle = window.getComputedStyle(addons);
        addonButtonStyle = window.getComputedStyle(addonButton);

        // Calculate position
        position = {
            top: window.scrollY + elPosition.top,
            left: window.scrollX + elPosition.left - parseInt(addonsStyle.left, 10) - parseInt(addonButtonStyle.marginLeft, 10)
        };

        // If left position is lower than 0, the buttons would be out of the viewport.
        // In that case, align buttons with the editor
        position.left = position.left < 0 ? elPosition.left + 8 : position.left;

        if (navigator.userAgent.match(/(iPhone|iPad|iPod|Android)/)) {
            position.top -= 5;
            const plusButton = this.buttons.getElementsByClassName('medium-editor-insert-buttons-show')[0];
            plusButton.style.lineHeight = plusButton.clientHeight + 'px';
        }

        this.buttons.style.left = `${position.left}px`;
        this.buttons.style.top = `${position.top}px`;
    }

    toggleButtons() {
        const el = this._editor.getSelectedParentElement();

        if (this.shouldDisplayButtonsOnElement(el)) {
            this.selectElement(el);
            this.showButtons();
        } else {
            this.deselectElement();
            this.hideButtons();
        }
    }

    shouldDisplayButtonsOnElement(el) {
        const addons = this._plugin.getAddons(),
            addonClassNames = [];
        let isAddon = false,
            belongsToEditor = false;

        // Don't show buttons when the element has text
        if (el.innerText.trim() !== '') {
            return false;
        }

        // Don't show buttons when the editor doesn't belong to editor
        this._plugin.getEditorElements().forEach((editor) => {
            if (utils.isChildOf(el, editor)) {
                belongsToEditor = true;
                return;
            }
        });

        if (!belongsToEditor) {
            return false;
        }

        // Get class names used by addons
        Object.keys(addons).forEach((addonName) => {
            const addon = addons[addonName];
            if (addon.elementClassName) {
                addonClassNames.push(addon.elementClassName);
            }
        });

        // Don't show buttons if the element is an addon element
        // - when the element has an addon class, or some of its parents have it
        addonClassNames.forEach((className) => {
            if (el.classList.contains(className) || utils.getClosestWithClassName(el, className)) {
                isAddon = true;
                return;
            }
        });

        return !isAddon;
    }

    selectElement(el) {
        this.selectedElement = el;
    }

    deselectElement() {
        this.selectedElement = null;
    }

    showButtons() {
        this.buttons.classList.add('medium-editor-insert-buttons-active');
        this.positionButtons();
    }

    hideButtons() {
        this.buttons.classList.remove('medium-editor-insert-buttons-active');
        this.buttons.classList.remove('medium-editor-insert-addons-active');
    }

    toggleAddons() {
        this.buttons.classList.toggle('medium-editor-insert-addons-active');
    }

    handleAddonClick(e) {
        const name = e.currentTarget.getAttribute('data-addon');

        e.preventDefault();

        this._plugin.getAddon(name).handleClick(e);
    }

    handleEnter(event, addon) {
        const focusedElement = this._editor.getSelectedParentElement(),
            wrapper = focusedElement.closest('.' + addon.elementClassName),
            newParagraph = document.createElement('p'),
            isOverlay = focusedElement.classList.contains(addon.overlayClassName),
            isFigcaption = focusedElement.nodeName.toLowerCase() === 'figcaption';

        if (isOverlay || isFigcaption) {
            event.preventDefault();

            this.inactivateAllOverlay(addon.activeClassName);

            newParagraph.appendChild(document.createElement('br'));
            wrapper.parentNode.insertBefore(newParagraph, wrapper.nextElementSibling);
            MediumEditor.selection.moveCursor(document, newParagraph, 0);

            this.hideCaption(null, addon.elementClassName);
        }
    }

    changeSelectionUpdateState(event) {
        const selectedElement = this._editor.getSelectedParentElement();

        if (selectedElement.nodeName.toLowerCase() === 'figcaption') {
            this._editor.stopSelectionUpdates();
        } else {
            this._editor.startSelectionUpdates();
        }
    }

    // editableKeydownDeleteイベントに登録する
    deleteAddonElement(event, addon) {
        const activeOverlay = this.getActiveOverlay(addon.activeClassName);

        if (activeOverlay
            && (
                activeOverlay.classList.contains(addon.activeClassName)
                || activeOverlay.querySelector('.' + addon.activeClassName) // for safari
            )
        ) {

            event.preventDefault();

            const wrapper = activeOverlay.closest('.' + addon.elementClassName),
                newParagraph = document.createElement('p');
            newParagraph.appendChild(document.createElement('br'));
            wrapper.parentNode.insertBefore(newParagraph, wrapper.nextElementSibling);
            MediumEditor.selection.moveCursor(document, newParagraph, 0);
            wrapper.remove();
        }
    }

    selectOverlay(event, addon) {
        const el = event.target;

        if (el.classList.contains(addon.overlayClassName)) {
            const overlay = el;
            this.activateOverlay(overlay, addon);
        }
    }

    unselectOverlay(event, addon) {
        const el = event.target;
        let clickedOverlay;

        if (el.classList.contains(addon.activeClassName)) {
            clickedOverlay = el;
        }

        this.inactivateAllOverlay(addon.activeClassName);
        this.activateOverlay(clickedOverlay, addon);
    }

    /*
     * @param {HTMLElement} overlay
     * @param {String} elementClassName
     */
    showCaption(overlay, elementClassName) {
        const root = overlay.closest('.' + elementClassName);
        let caption = root.querySelector('figcaption');

        if (caption) {
            return caption;
        } else {
            caption = document.createElement('figcaption');
            caption.setAttribute('contenteditable', true);

            root.insertBefore(caption, overlay.nextElementSibling);

            this._plugin.on(caption, 'focus', this.focusFigcaption.bind(this))
            this._plugin.on(caption, 'blur', this.blurFigcaption.bind(this))
            this._plugin.on(caption, 'keydown', this.keydownFigcaption.bind(this))

            return caption
        }
    }

    /*
     * @param {HTMLElement} el
     * @param {String} elementClassName
     */
    hideCaption(el, elementClassName) {
        const roots = utils.getElementsByClassName(this._plugin.getEditorElements(), elementClassName);
        let figcaption;

        Array.prototype.forEach.call(roots, root => {
            if (!(el && root.contains(el))) {
                figcaption = root.querySelector('figcaption');

                if (figcaption && figcaption.textContent.length === 0) {
                    figcaption.remove();
                }
            }
        });
    }

    focusFigcaption(event) {
        const figcaption = event.target;
        if (figcaption.textContent.length === 0 && figcaption.getElementsByTagName('br').length === 0) {
            figcaption.appendChild(document.createElement('br'));
        }
    }

    blurFigcaption(event) {
        const figcaption = event.target;
        if (figcaption.textContent.length === 0) {
            figcaption.innerHTML = '';
        }
    }

    keydownFigcaption(event) {
        if ([MediumEditor.util.keyCode.BACKSPACE, MediumEditor.util.keyCode.DELETE].indexOf(event.which) !== -1) {
            const figcaption = event.target;
            if (figcaption.textContent.length === 0) {
                event.preventDefault();
            }
        }
    }

    getActiveOverlay(activeClassName) {
        const overlays = utils.getElementsByClassName(this._plugin.getEditorElements(), activeClassName);
        return overlays[0];
    }

    /*
     * @param {HTMLElement} overlay
     * @param {Object} addon
     */
    activateOverlay(overlay, addon) {
        if (overlay) {
            if (addon.options.caption) {
                this.showCaption(overlay, addon.elementClassName);
            }

            overlay.classList.add(addon.activeClassName);
            MediumEditor.selection.selectNode(overlay, document);
        }
    }

    inactivateAllOverlay(activeClassName) {
        const overlays = utils.getElementsByClassName(this._plugin.getEditorElements(), activeClassName);

        Array.prototype.forEach.call(overlays, overlay => {
            overlay.classList.remove(activeClassName);
        });
    }

    focusOnPreviousElement(event, addon) {
        const selection = window.getSelection();
        if (MediumEditor.selection.getSelectionHtml(document) || !(selection && selection.rangeCount)) {
            return;
        }

        const range = MediumEditor.selection.getSelectionRange(document),
            focusedElement = MediumEditor.selection.getSelectedParentElement(range),
            caretPosition = MediumEditor.selection.getCaretOffsets(focusedElement).left,
            isBackspace = MediumEditor.util.isKey(event, MediumEditor.util.keyCode.BACKSPACE),
            isDelete = MediumEditor.util.isKey(event, MediumEditor.util.keyCode.DELETE);
        let sibling;

        // backspace：前の文字を削除 / delete：後ろの文字を削除
        if (isBackspace && caretPosition === 0) {
            sibling = focusedElement.previousElementSibling;
        } else if (isDelete && caretPosition === focusedElement.innerText.length) {
            sibling = focusedElement.nextElementSibling;
        }

        if (sibling && sibling.classList.contains(addon.elementClassName)) {
            event.preventDefault();

            const overlay = sibling.querySelector('.' + addon.overlayClassName);
            this.activateOverlay(overlay, addon);

            if (focusedElement.textContent.length === 0) {
                focusedElement.remove();
            }
        }
    }
}
