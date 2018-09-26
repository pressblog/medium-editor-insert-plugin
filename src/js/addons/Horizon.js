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

        selectedElement.parentNode.insertBefore(hr, selectedElement);

        this._plugin.getCore().hideButtons();
    }

    returnNewParagraph(e) {
        const el = e.target;

        if (el.classList.contains(this.elementClassName)) {
            const hr = el,
                newParagraph = document.createElement('p');
            newParagraph.appendChild(document.createElement('br'));

            hr.parentNode.insertBefore(newParagraph, hr.nextElementSibling);

            this._editor.selectElement(newParagraph);

        }
    }
}
