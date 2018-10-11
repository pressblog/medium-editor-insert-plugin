import MediumEditor from 'medium-editor';
import utils from '../utils';
import Toolbar from '../Toolbar';

export default class Images {

    constructor(plugin, options) {
        this.options = {
            label: '<span class="fa fa-camera"></span>',
            aria: '画像アップロード',
            preview: true,
            previewSpinner: '<span class="fa fa-spinner fa-spin"></span>',
            caption: true,
            uploadUrl: 'upload.php',
            deleteUrl: 'delete.php',
            deleteMethod: 'DELETE',
            deleteData: {},
            toolbar: {
                buttons: [
                    {
                        name: 'align-left',
                        action: 'left',
                        label: 'Left'
                    },
                    {
                        name: 'align-center',
                        action: 'center',
                        label: 'Center'
                    },
                    {
                        name: 'align-right',
                        action: 'right',
                        label: 'Right'
                    }
                ]
            }
        };

        Object.assign(this.options, options);

        this._plugin = plugin;
        this._editor = this._plugin.base;
        this.elementClassName = 'medium-editor-insert-image';
        this.activeClassName = this.elementClassName + '-active';
        this.overlayClassName = this.elementClassName + '-overlay';
        this.label = this.options.label;

        this.initToolbar();
        this.events();
    }

    events() {
        this._plugin.on(document, 'click', this.unselectImage.bind(this));
        this._plugin.on(document, 'click', this.hideCaption.bind(this));

        this._plugin.subscribe('editableKeydownDelete', this.handleDelete.bind(this));
        this._plugin.subscribe('editableKeydownEnter', this.focusOnNextElement.bind(this));

        this._plugin.getEditorElements().forEach((editor) => {
            this._plugin.on(editor, 'click', this.selectImage.bind(this));
        });
    }

    handleClick() {
        this._input = document.createElement('input');
        this._input.type = 'file';
        this._input.accept = 'image/*';
        this._input.multiple = true;

        this._plugin.on(this._input, 'change', this.uploadFiles.bind(this));

        this._input.click();
    }

    initToolbar() {
        this.toolbar = new Toolbar({
            plugin: this._plugin,
            type: 'images',
            activeClassName: this.activeClassName,
            buttons: this.options.toolbar.buttons
        });

        this._editor.extensions.push(this.toolbar);
    }

    uploadFiles() {
        Array.prototype.forEach.call(this._input.files, (file) => {
            // Generate uid for this image, so we can identify it later
            // and we can replace preview image with uploaded one
            const uid = utils.generateRandomString();

            if (this.options.preview) {
                this.preview(file, uid);
            } else {
                this.upload(file, uid);
            }
        });

        this._plugin.getCore().hideButtons();
    }

    preview(file, uid) {
        const reader = new FileReader();

        reader.onload = (e) => {
            this.insertImage(e.target.result, uid, file);
        };

        reader.readAsDataURL(file);
    }

    upload(file, uid) {
        const xhr = new XMLHttpRequest(),
            data = new FormData();

        xhr.open("POST", this.options.uploadUrl, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                const image = document.querySelector(`[data-uid="${uid}"]`);

                this.disablePreviewOverlay(image);

                if (image) {
                    this.replaceImage(image, xhr.responseText);
                } else {
                    this.insertImage(xhr.responseText);
                }
            }
            // TODO: xhr.status>=400の時の処理
        };

        data.append("file", file);
        xhr.send(data);
    }

    insertImage(url, uid, file) {
        const selectedElement = this._plugin.getCore().selectedElement,
            figure = document.createElement('figure'),
            wrapper = document.createElement('div'),
            overlay = document.createElement('div'),
            img = document.createElement('img');
        let domImage;

        overlay.classList.add(this.overlayClassName);
        wrapper.classList.add(this.elementClassName + '-wrapper');
        wrapper.appendChild(overlay);
        figure.setAttribute('contenteditable', false);
        figure.classList.add(this.elementClassName);
        figure.appendChild(wrapper);

        selectedElement.parentNode.insertBefore(figure, selectedElement);

        img.alt = '';
        if (uid) {
            img.setAttribute('data-uid', uid);
        }

        domImage = new Image();
        domImage.onload = () => {
            img.src = domImage.src;
            wrapper.insertBefore(img, overlay);

            if (url.match(/^data:/)) {
                this.enablePreviewOverlay(img);
                this.upload(file, uid);
            }

        };
        domImage.src = url;

        // Return domImage so we can test this function easily
        return domImage;
    }

    replaceImage(image, url) {
        const domImage = new Image();

        domImage.onload = () => {
            image.src = domImage.src;
            image.removeAttribute('data-uid');
        };

        domImage.src = url;

        // Return domImage so we can test this function easily
        return domImage;
    }

    enablePreviewOverlay(image) {
        const wrapper = image.closest('.' + this.elementClassName),
            overlay = wrapper.querySelector('.' + this.overlayClassName);

        overlay.classList.add(this.elementClassName + '-preview');
        if (this.options.previewSpinner) {
            overlay.innerHTML = this.options.previewSpinner;
        }
    }

    disablePreviewOverlay(image) {
        const wrapper = image.closest('.' + this.elementClassName),
            overlay = wrapper.querySelector('.' + this.overlayClassName);

        overlay.classList.remove(this.elementClassName + '-preview');
        overlay.innerHTML = '';
    }

    focusOnNextElement(e) {
        this._plugin.getCore().focusOnNextElement(e, this);
    }

    handleDelete(e) {
        this._plugin.getCore().deleteAddonElement(e, this);
        this._plugin.getCore().focusOnPreviousElement(e, this);
    }

    selectImage(e) {
        this._plugin.getCore().selectOverlay(e, this);
    }

    unselectImage(e) {
        this._plugin.getCore().unselectOverlay(e, this);
    }

    hideCaption(e) {
        this._plugin.getCore().hideCaption(e.target, this.elementClassName);
    }

    deleteFile(image) {
        if (this.options.deleteUrl) {
            const xhr = new XMLHttpRequest(),
                data = Object.assign({}, {
                    file: image
                }, this.options.deleteData);

            xhr.open(this.options.deleteMethod, this.options.deleteUrl, true);
            xhr.send(data);
        }
    }

}
