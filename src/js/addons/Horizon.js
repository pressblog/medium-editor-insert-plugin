import MediumEditor from 'medium-editor';
import utils from '../utils';
import Toolbar from '../Toolbar';

export default class Horizon {

    constructor(plugin, options) {
        this.options = {
            label: '<span>--</span>',
            aria: '区切り線'
        };

        Object.assign(this.options, options);

        this._plugin = plugin;
        this._editor = this._plugin.base;
        this.elementClassName = 'medium-editor-insert-hr';
        this.activeClassName = this.elementClassName + '-active';

        this.label = this.options.label;

        this.events();
    }

    events() {
        this._plugin.getEditorElements().forEach((editor) => {
            this._plugin.on(editor, 'click', this.returnNewParagraph.bind(this));
        });
    }

    handleClick() {
        const selectedElement = this._plugin.getCore().selectedElement,
            hr = document.createElement('hr');

        hr.classList.add(this.elementClassName);

        selectedElement.parentNode.replaceChild(hr, selectedElement);

        this.createNewParagraph(hr);

        this._plugin.getCore().hideButtons();
    }

    returnNewParagraph(e) {
        const el = e.target;

        if (el.classList.contains(this.elementClassName)) {
            this.createNewParagraph(el);
        }
    }

    createNewParagraph(el) {
        const newParagraph = document.createElement('p');

        el.parentNode.insertBefore(newParagraph, el.nextElementSibling);

        this._editor.selectElement(newParagraph);

        newParagraph.appendChild(document.createElement('br'));
    }
}
