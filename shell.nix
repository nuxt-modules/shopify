{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        nodejs_24
        pnpm
        git
    ];

    shellHook = ''
        export PNPM_HOME="$HOME/.pnpm"
        export PATH="$PNPM_HOME:$PATH"
    '';
}
