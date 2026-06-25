{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        nodejs_24
        bun
        git
    ];
}
