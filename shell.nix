{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
    buildInputs = with pkgs; [
        git
        bun
    ];

    NODE_ENV="development";
}
