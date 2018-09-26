import MediumEditor from 'medium-editor';
import utils from '../utils';
import Toolbar from '../Toolbar';

export default class Images {

    constructor(plugin, options) {
        this.options = {
            label: '<span class="fa fa-camera"></span>',
            aria: '画像アップロード',
            preview: true,
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
        this.elementClassName = 'medium-editor-insert-images';
        this.activeClassName = 'medium-editor-insert-image-active';
        this.label = this.options.label;

        this.initToolbar();
        this.events();
    }

    events() {
        this._plugin.on(document, 'click', this.unselectImage.bind(this));
        this._plugin.on(document, 'click', this.hideCaption.bind(this));
        this._plugin.on(document, 'keydown', this.moveToNextParagraph.bind(this));
        this._plugin.on(document, 'keydown', this.removeImage.bind(this));
        this._plugin.on(document, 'keydown', this.caretMoveToAndSelectImage.bind(this));

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
            img = document.createElement('img');
        let domImage;

        figure.setAttribute('contenteditable', 'false');
        selectedElement.parentNode.insertBefore(figure, selectedElement);
        figure.classList.add(this.elementClassName);
        this._plugin.getCore().selectElement(figure);

        img.alt = '';
        if (uid) {
            img.setAttribute('data-uid', uid);
        }

        domImage = new Image();
        domImage.onload = () => {
            img.src = domImage.src;
            figure.appendChild(img);

            if (url.match(/^data:/)) {
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

    selectImage(e) {
        const el = e.target;

        if (el.nodeName.toLowerCase() === 'img' && utils.getClosestWithClassName(el, this.elementClassName)) {
            el.classList.add(this.activeClassName);

            if (this.options.caption) {
                this.showCaption(el);
            }

            this._editor.selectElement(el);
        }
    }

    unselectImage(e) {
        const el = e.target;
        let clickedImage, images;

        // Unselect all selected images. If an image is clicked, unselect all except this one.
        if (el.nodeName.toLowerCase() === 'img' && el.classList.contains(this.activeClassName)) {
            clickedImage = el;
        }

        images = utils.getElementsByClassName(this._plugin.getEditorElements(), this.activeClassName);
        Array.prototype.forEach.call(images, (image) => {
            if (image !== clickedImage) {
                image.classList.remove(this.activeClassName);
            }
        });
    }

    showCaption(el) {
        this._plugin.getCore().showCaption(el, '.' + this.elementClassName);
    }

    hideCaption(e) {
        const el = e.target;

        this._plugin.getCore().hideCaption(el, this.elementClassName);
    }

    removeImage(e) {
        if ([MediumEditor.util.keyCode.BACKSPACE, MediumEditor.util.keyCode.DELETE].indexOf(e.which) === -1) return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = MediumEditor.selection.getSelectionRange(document),
            focusedElement = MediumEditor.selection.getSelectedParentElement(range);

        if (focusedElement.classList.contains(this.activeClassName)
            || focusedElement.querySelector('.' + this.activeClassName) // for safari
        ) {
            const wrapper = focusedElement.closest('.' + this.elementClassName);

            this._plugin.getCore().deleteElement(wrapper);
        }
    }

    moveToNextParagraph(e) {
        this._plugin.getCore().moveToNewUnderParagraph(e, this.elementClassName, this.activeClassName);
    }

    caretMoveToAndSelectImage(e) {
        this._plugin.getCore().caretMoveToAndSelect(e, this.elementClassName, this.activeClassName, 'img');
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
