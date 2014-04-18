javascript:((function(){
  if (!window.removeLastScript)
{
  window.removeLastScript = function() {
    var scriptNode = document.getElementsByTagName("body")[0].lastChild;
    var src = scriptNode.getAttribute("src");
    try {
      scriptNode.parentNode.removeChild(scriptNode);
    }
    catch (e) {}
    return src;
  };
}
if (!window.embedpaperserverIframe)
{
  window.embedpaperserverIframe = function (hroot) {
  window.paperserverHtml = "<html>" + document.documentElement.innerHTML + "</html>";
  var iframe = document.createElement("IFRAME");
  iframe.src = "about:blank";
  iframe.width = 0;
  iframe.height = 0;
  iframe.style.display = "none";
  var bodies = document.getElementsByTagName("BODY");
  var body = bodies[0];
  body.appendChild(iframe);
  var iframeDoc = iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write("" + "<html>" + "<head></head>" + "<body onload='submitForm();'>" + "\t<form id='paperserverForm' method='post' target='paperserver_bookmarklet' onsubmit='submitPaperServer(this)' action='" + hroot + "/paper/add_from_bookmarklet' accept-charset='UTF-8'>" + "\t\t<textarea id='htmlCode' name='html'></textarea>" + "\t\t<input type='hidden' name='url' id='paperserverUrl'/>" + "\t</form>" + "\t<script>" + "\tfunction submitForm() {" + "\t\tvar url = document.getElementById('paperserverUrl');" + "\t\turl.value = window.parent.document.location.href;" + "\t\tvar html = document.getElementById('htmlCode');" + "\t\thtml.value = window.parent.paperserverHtml;" + "\t\tvar form = document.getElementById('paperserverForm');" + "\t\tform.submit();" + "\t}" + "function submitPaperServer(f) {window.open('about:blank',f.target,'width=300,height=200');}" + "\t<\/script>" + "</body>" + "</html>");
  iframeDoc.close();
};
}
if (!window.runpaperserverBookmarklet) window.runpaperserverBookmarklet = function () {
  var source = window.removeLastScript();
  var paperserverHroot = source.match(/^http?:\/\/[^/]+/);
  // console.log(source,paperserverHroot);
  window.embedpaperserverIframe(paperserverHroot)};
  try {
    window.runpaperserverBookmarklet();
  } catch(e) {};

})());
