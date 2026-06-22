import './App.css';

function App() {
  const version = browser.runtime.getManifest().version;

  return (
    <>
      <div className="App">
          <h2>
              Emoticon Replacer Extension
          </h2>
          <div className="version">
              버전 v{version}
          </div>
          <div>
              커스터마이징 기능은 준비 중입니다.
          </div>
      </div>
    </>
  );
}

export default App;
