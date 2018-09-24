import MediumEditor from 'medium-editor';
import utils from '../utils';
import Toolbar from '../Toolbar';

export default class Video {

    constructor(plugin, options) {
        this.options = {
            label: '<span class="fa fa-video-camera"></span>',
            aria: '動画アップロード',
            preview: true,
            caption: true,
            uploadUrl: 'upload.php',
            maxBytes: 8 * 1000 * 1000 // 8MB
        };

        Object.assign(this.options, options);

        this._plugin = plugin;
        this._editor = this._plugin.base;
        this.elementClassName = 'medium-editor-insert-video';
        this.activeClassName = this.elementClassName + '-active';
        this.overlayClassName = this.elementClassName + '-overlay';
        this.label = this.options.label;

        this.events();
    }

    events() {
        this._plugin.on(document, 'click', this.unselectVideo.bind(this));
        this._plugin.on(document, 'click', this.hideCaption.bind(this));
        this._plugin.on(document, 'keydown', this.moveToNextParagraph.bind(this));
        this._plugin.on(document, 'keydown', this.removeVideo.bind(this));
        this._plugin.on(document, 'keydown', this.caretMoveToAndSelectVideo.bind(this));

        this._plugin.getEditorElements().forEach(editor => {
            this._plugin.on(editor, 'click', this.selectVideo.bind(this));
        });
    }

    handleClick() {
        this._input = document.createElement('input');
        this._input.type = 'file';
        this._input.accept = 'video/*';

        this._plugin.on(this._input, 'change', this.uploadFile.bind(this));

        this._input.click();
    }

    selectVideo(e) {
        const el = e.target;

        if (el.classList.contains(this.overlayClassName) && utils.getClosestWithClassName(e.target, this.elementClassName)) {
            el.classList.add(this.activeClassName);

            if (this.options.caption) {
                this.showCaption(el);
            }


            this._editor.selectElement(el);
        }
    }

    // TODO: Image.removeImageと全く同じ処理
    removeVideo(e) {
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

    // TODO: Imageと合わせてリファクタ
    unselectVideo(e) {
        const el = e.target;
        let selectedVideo, videos;

        if (el.classList.contains(this.activeClassName)) {
            selectedVideo = el;
        }

        videos = utils.getElementsByClassName(this._plugin.getEditorElements(), this.activeClassName);
        Array.prototype.forEach.call(videos, video => {
            if (video !== selectedVideo) {
                video.classList.remove(this.activeClassName);
            }
        });
    }

    // TODO: Imageと合わせてリファクタ
    showCaption(video) {
        const wrapper = utils.getClosestWithClassName(video, this.elementClassName);
        let caption = wrapper.querySelector('figcaption');

        if (!caption) {
            caption = document.createElement('figcaption');
            caption.setAttribute('contenteditable', true);

            wrapper.insertBefore(caption, video.nextElementSibling);
        }
    }

    // TODO: Imageと合わせてリファクタ
    hideCaption(e) {
        const el = e.target,
            wrappers = utils.getElementsByClassName(this._plugin.getEditorElements(), this.elementClassName);
        let figcaption;

        Array.prototype.forEach.call(wrappers, wrapper => {
            if (!wrapper.contains(el)) {
                figcaption = wrapper.querySelector('figcaption');

                if (figcaption && figcaption.textContent.length === 0) {
                    figcaption.remove();
                }
            }
        });
    }

    uploadFile() {
        const file = this._input.files[0];

        if (file.size > this.options.maxBytes) {
            alert('ファイルサイズが大きすぎてアップロードできません m(_ _)m');
        }

        this.insert(file);

        this._plugin.getCore().hideButtons();
    }

    insert(file) {
        const video = document.createElement('video'),
            source = document.createElement('source'),
            figure = document.createElement('figure'),
            selectedElement = this._plugin.getCore().selectedElement;

        figure.innerHTML = [
            `<div class="${this.elementClassName}-wrapper">`,
            '<video controls muted="true"></video>',
            `<div class="${this.overlayClassName}"></div>`,
            '</div>'
        ].join('');
        figure.setAttribute('contenteditable', false);
        figure.classList.add(this.elementClassName);

        selectedElement.parentNode.insertBefore(figure, selectedElement);
        selectedElement.remove();

        const newParagraph = document.createElement('p');
        newParagraph.appendChild(document.createElement('br'));
        figure.parentNode.insertBefore(newParagraph, figure.nextSibling);
        this._plugin.getCore().selectElement(newParagraph);

        this.upload(file, figure);
    }

    replace(url, root) {
        const source = document.createElement('source'),
            video = root.querySelector('video');

        source.src = url;

        video.appendChild(source);
    }

    upload(file, root) {
        const xhr = new XMLHttpRequest(),
            data = new FormData();

        xhr.open("POST", this.options.uploadUrl, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4 && xhr.status === 200) {
                this.replace(xhr.responseText, root);
            }
        };

        data.append("file", file);
        xhr.send(data);
    }

    moveToNextParagraph(e) {
        this._plugin.getCore().moveToNewUnderParagraph(e, this.elementClassName, this.activeClassName);
    }

    caretMoveToAndSelectVideo(e) {
        this._plugin.getCore().caretMoveToAndSelect(e, this.elementClassName, this.activeClassName, '.' + this.overlayClassName);
    }

}
