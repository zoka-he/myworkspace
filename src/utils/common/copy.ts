/**
 * 复制单行内容到粘贴板
 * content : 需要复制的内容
 * message : 复制完后的提示，不传则默认提示"复制成功"
 */
export default function copyToClip(content: string) {
	const textarea = document.createElement('textarea');
	textarea.value = content;
	document.body.appendChild(textarea);
	textarea.select();
	if (document.execCommand('copy')) {
		document.execCommand('copy');
	}
	document.body.removeChild(textarea);

}